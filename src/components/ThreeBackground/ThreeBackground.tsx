'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './styles.module.scss';

const DEFAULT_MODEL_URL = '/night_forest.glb';

// ---------------------------------------------------------------------------
// The scene as it is set up in Blender (Z-up, metric, 1 unit = 1 m). Positions
// and rotations are copied verbatim from Blender; everything in world space is
// rotated -90 degrees around X to land in the Y-up space that glTF and three.js
// use, which maps (x, y, z) to (x, z, -y).
//
//   Camera      position (0, -7.5, 1.72), euler XYZ (88, 0, 2) deg, 55mm/36mm
//   Moon        SUN, rotation (55, 0, 60) deg
//   Fill        POINT at (-2.5, -3, 2.2)
//   Flashlight  SPOT parented to the camera, local offset (0.22, -0.1, -0.05)
//               and local rotation (1, 0.5, 0) deg
//   World       background (0.012, 0.02, 0.045) linear
//
// Light intensities are candela/lux, exactly as Blender's glTF export writes
// them (KHR_lights_punctual), so they need physical light units in three.js.
// ---------------------------------------------------------------------------
const BLENDER_CAMERA_POSITION: [number, number, number] = [0, -7.5, 1.72];
const BLENDER_CAMERA_ROTATION_DEG: [number, number, number] = [88, 0, 2];
const BLENDER_WORLD_COLOR: [number, number, number] = [0.012, 0.02, 0.045];

const BLENDER_MOON = {
    rotationDeg: [55, 0, 60] as [number, number, number],
    color: [0.5, 0.62, 1] as [number, number, number],
    intensity: 1024.5, // lux
};

const BLENDER_FILL = {
    position: [-2.5, -3, 2.2] as [number, number, number],
    color: [0.5, 0.62, 0.9] as [number, number, number],
    intensity: 217.41, // candela
};

const BLENDER_FLASHLIGHT = {
    // Camera-local, so it needs no axis conversion.
    position: [0.22, -0.1, -0.05] as [number, number, number],
    rotationDeg: [1, 0.5, 0] as [number, number, number],
    color: [1, 0.86, 0.66] as [number, number, number],
    intensity: 489162.72, // candela - a 9000 W studio spot
    angle: 0.305433, // rad, half of Blender's 35 degree cone
    penumbra: 0.75,
};

// Blender's levels suit EEVEE with the AgX view transform. three.js (r151) has no
// AgX - ACES filmic is the closest - and at full strength the flashlight alone
// turns the ground into pure white. A torch in the real world sits around
// 5000-20000 cd, so the flashlight is brought down to 11000 cd and every other
// light keeps its strength relative to it, which preserves the balance of the
// Blender setup while letting ACES expose it properly.
const FLASHLIGHT_CANDELA = 11000;
const LIGHT_SCALE = FLASHLIGHT_CANDELA / BLENDER_FLASHLIGHT.intensity;

// Blender renders 1920x1080 (16:9) with a 55mm lens on a 36mm sensor, so the
// vertical field of view is 20.86 degrees.
const CAMERA_FOV = 20.86;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 1000;

// ACES is a stand-in for Blender's AgX, exposure 0.93 mirrors Blender's -0.1 EV.
const TONE_MAPPING_EXPOSURE = 0.93;

// Blender's GroundFog is a volumetric material, which glTF cannot carry over:
// the mesh arrives as an opaque white box around the camera (hidden below). The
// atmosphere is rebuilt from two parts instead - an exponential distance haze
// plus a few sheets of ground mist that catch the flashlight.
const GROUND_FOG_MATERIAL = /fog/i;
const FOG_COLOR: [number, number, number] = [0.03, 0.042, 0.07];
const FOG_DENSITY = 0.13;

// Ground mist sheets: big horizontal planes with a soft ring of haze painted into
// their alpha channel. The ring keeps the haze away from the ground right in
// front of the camera, so the torch pool stays clear and the mist sits in the
// middle distance where the trees fade out.
const MIST_SIZE = 170;
const MIST_ALBEDO: [number, number, number] = [0.2, 0.25, 0.34];
const MIST_INNER_RADIUS = 0.09; // haze starts here, as a fraction of the sheet
const MIST_OUTER_RADIUS = 0.34; // full density from here on
const MIST_FADE_START = 0.72; // and fades back out towards the edges
const MIST_LAYERS = [
    { y: 0.45, opacity: 0.15, drift: 0.0022 },
    { y: 0.95, opacity: 0.12, drift: -0.0029 },
    { y: 1.6, opacity: 0.1, drift: 0.0038 },
    { y: 2.5, opacity: 0.07, drift: -0.0046 },
];

// The ForestFloor material gets its colour from a procedural noise setup that the
// export cannot bake, so it arrives as plain white and would blow out. This is the
// average tone of Blender's Color Ramp.
const GROUND_MATERIAL = /forestfloor/i;
const GROUND_ALBEDO: [number, number, number] = [0.05, 0.042, 0.03];

const FOCUS_DISTANCE = 20; // distance at which the camera pivots while it sways

// three@0.151 still ships the legacy `outputEncoding` and `useLegacyLights`
// APIs, which are no longer present in the installed typings.
const LEGACY_SRGB_ENCODING = 3001;

const Y_UP = new THREE.Matrix4().makeRotationX(-Math.PI / 2);

const toLinearColor = (rgb: [number, number, number]) =>
    new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.LinearSRGBColorSpace);

// Blender's XYZ euler is Rz * Ry * Rx, which three.js builds from the 'ZYX'
// order with the same angle values.
const blenderEuler = (deg: [number, number, number]) =>
    new THREE.Euler(
        THREE.MathUtils.degToRad(deg[0]),
        THREE.MathUtils.degToRad(deg[1]),
        THREE.MathUtils.degToRad(deg[2]),
        'ZYX',
    );

/** Converts a Blender world transform (Z-up) into a three.js one (Y-up). */
function blenderToThree(position: [number, number, number], rotationDeg: [number, number, number]) {
    const matrix = new THREE.Matrix4().makeRotationFromEuler(blenderEuler(rotationDeg));
    matrix.setPosition(new THREE.Vector3(...position));
    matrix.premultiply(Y_UP);

    return {
        position: new THREE.Vector3().setFromMatrixPosition(matrix),
        quaternion: new THREE.Quaternion().setFromRotationMatrix(matrix),
    };
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
};

const hashNoise = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
};

/** Cheap value noise, so the haze is not a perfect ring. */
const valueNoise = (x: number, y: number) => {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    const fadeX = x - cellX;
    const fadeY = y - cellY;
    const smoothX = fadeX * fadeX * (3 - 2 * fadeX);
    const smoothY = fadeY * fadeY * (3 - 2 * fadeY);
    const topLeft = hashNoise(cellX, cellY);
    const topRight = hashNoise(cellX + 1, cellY);
    const bottomLeft = hashNoise(cellX, cellY + 1);
    const bottomRight = hashNoise(cellX + 1, cellY + 1);

    return (
        topLeft +
        (topRight - topLeft) * smoothX +
        (bottomLeft - topLeft) * smoothY +
        (topLeft - topRight - bottomLeft + bottomRight) * smoothX * smoothY
    );
};

/** Soft, slightly irregular ring of haze, painted into an alpha texture. */
function createMistTexture(): THREE.CanvasTexture | null {
    const size = 256;
    const target = document.createElement('canvas');
    target.width = size;
    target.height = size;

    const context = target.getContext('2d');
    if (!context) return null;

    const image = context.createImageData(size, size);
    const center = size / 2;

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const radius = Math.hypot(x - center, y - center) / center;
            const ring =
                smoothstep(MIST_INNER_RADIUS, MIST_OUTER_RADIUS, radius) *
                (1 - smoothstep(MIST_FADE_START, 1, radius));
            const noise = 0.5 * valueNoise(x / 34, y / 34) + 0.5 * valueNoise(x / 13, y / 13);
            const alpha = THREE.MathUtils.clamp(ring * (0.45 + 0.55 * noise), 0, 1);
            const index = (y * size + x) * 4;

            image.data[index] = 255;
            image.data[index + 1] = 255;
            image.data[index + 2] = 255;
            image.data[index + 3] = Math.round(alpha * 255);
        }
    }

    context.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(target);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    return texture;
}

interface Props {
    /** Path to the .glb scene, relative to the public folder. */
    modelUrl?: string;
    /** Extra class names for the wrapper. */
    className?: string;
    /** Vertical field of view of the camera, in degrees. */
    fov?: number;
    /** Idle camera sway and pointer parallax. */
    animated?: boolean;
}

export default function ThreeBackground({
    modelUrl = DEFAULT_MODEL_URL,
    className,
    fov = CAMERA_FOV,
    animated = true,
}: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;
        if (!wrapper || !canvas) return;

        // Initial drawing-buffer size, in step with the CSS box. `resize()` below
        // keeps it up to date on every layout change.
        canvas.width = wrapper.clientWidth || window.innerWidth;
        canvas.height = wrapper.clientHeight || window.innerHeight;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true, // the CSS gradient shows through if WebGL is missing
                powerPreference: 'high-performance',
            });
        } catch (error) {
            console.error('ThreeBackground: WebGL is not available', error);
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        (renderer as THREE.WebGLRenderer & { outputEncoding: number; useLegacyLights: boolean })
            .outputEncoding = LEGACY_SRGB_ENCODING;
        // Physical light units, so the candela/lux values above mean the same as
        // they do in Blender and in glTF.
        (renderer as THREE.WebGLRenderer & { useLegacyLights: boolean }).useLegacyLights = false;

        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // The canvas stays transparent so the CSS gradient behind it acts as the
        // sky: three.js renders a plain background colour as a clear colour, which
        // skips tone mapping and would look much brighter than Blender's.
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(toLinearColor(FOG_COLOR), FOG_DENSITY);

        const worldColor = toLinearColor(BLENDER_WORLD_COLOR);
        const { position: cameraPosition, quaternion: cameraQuaternion } = blenderToThree(
            BLENDER_CAMERA_POSITION,
            BLENDER_CAMERA_ROTATION_DEG,
        );
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
        const target = cameraPosition.clone().addScaledVector(forward, FOCUS_DISTANCE);

        const camera = new THREE.PerspectiveCamera(fov, 1, CAMERA_NEAR, CAMERA_FAR);
        camera.position.copy(cameraPosition);
        camera.lookAt(target);
        // Lights parented to the camera only render if the camera is in the graph.
        scene.add(camera);

        // The Blender world contributes a faint blue environment light.
        scene.add(new THREE.AmbientLight(worldColor, Math.PI));

        // Moon: a sun travelling along the -Z axis of its Blender rotation.
        const moonTransform = blenderToThree([0, 0, 0], BLENDER_MOON.rotationDeg);
        const moonDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(moonTransform.quaternion);

        const moon = new THREE.DirectionalLight(
            toLinearColor(BLENDER_MOON.color),
            BLENDER_MOON.intensity * LIGHT_SCALE,
        );
        moon.position.copy(moonDirection).multiplyScalar(-60);
        moon.castShadow = true;
        moon.shadow.mapSize.set(2048, 2048);
        moon.shadow.camera.near = 1;
        moon.shadow.camera.far = 200;
        moon.shadow.camera.left = -45;
        moon.shadow.camera.right = 45;
        moon.shadow.camera.top = 45;
        moon.shadow.camera.bottom = -45;
        moon.shadow.normalBias = 0.03;
        scene.add(moon);

        const fill = new THREE.PointLight(
            toLinearColor(BLENDER_FILL.color),
            BLENDER_FILL.intensity * LIGHT_SCALE,
            0, // no cutoff distance in Blender
            2, // inverse-square falloff
        );
        fill.position.copy(blenderToThree(BLENDER_FILL.position, [0, 0, 0]).position);
        scene.add(fill);

        // Flashlight: a spot held next to the camera, so it keeps the local offset
        // and orientation it has as a child of the camera in Blender.
        const flashlight = new THREE.SpotLight(
            toLinearColor(BLENDER_FLASHLIGHT.color),
            FLASHLIGHT_CANDELA,
            0,
            BLENDER_FLASHLIGHT.angle,
            BLENDER_FLASHLIGHT.penumbra,
            2,
        );
        flashlight.position.set(...BLENDER_FLASHLIGHT.position);
        flashlight.rotation.copy(blenderEuler(BLENDER_FLASHLIGHT.rotationDeg));
        flashlight.castShadow = true;
        flashlight.shadow.mapSize.set(1024, 1024);
        flashlight.shadow.camera.near = 0.2;
        flashlight.shadow.camera.far = 60;
        flashlight.shadow.normalBias = 0.02;

        // three.js aims a spot light at `target`, so it goes one unit ahead of the
        // light along its own -Z axis.
        const flashlightAim = new THREE.Vector3(0, 0, -1).applyQuaternion(flashlight.quaternion);
        flashlight.target.position.copy(flashlight.position).add(flashlightAim);
        camera.add(flashlight, flashlight.target);

        // Ground mist: horizontal sheets that pick up the flashlight the way the
        // mist in Blender's volumetric render does, drifting slowly across the
        // forest floor.
        const mistGroup = new THREE.Group();
        const mistTextures: { texture: THREE.Texture; drift: number }[] = [];

        for (const layer of MIST_LAYERS) {
            const texture = createMistTexture();
            if (!texture) break;

            const material = new THREE.MeshStandardMaterial({
                color: toLinearColor(MIST_ALBEDO),
                map: texture,
                transparent: true,
                opacity: layer.opacity,
                depthWrite: false, // the sheets blend with each other
                side: THREE.DoubleSide,
                roughness: 1,
                metalness: 0,
            });
            const sheet = new THREE.Mesh(new THREE.PlaneGeometry(MIST_SIZE, MIST_SIZE), material);

            sheet.rotation.x = -Math.PI / 2;
            sheet.position.y = layer.y;
            mistGroup.add(sheet);
            mistTextures.push({ texture, drift: layer.drift });
        }
        scene.add(mistGroup);

        const baseOffset = cameraPosition.clone().sub(target);
        const offset = baseOffset.clone();
        const pointer = new THREE.Vector2();
        const pointerTarget = new THREE.Vector2();
        const UP = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3();

        const resize = () => {
            const width = wrapper.clientWidth || window.innerWidth;
            const height = wrapper.clientHeight || window.innerHeight;
            if (!width || !height) return;

            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(wrapper);
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', resize);
        resize();

        const disposeObject = (object: THREE.Object3D) => {
            object.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;

                mesh.geometry?.dispose();
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const material of materials) material?.dispose();
            });
        };

        let model: THREE.Object3D | null = null;
        let disposed = false;

        new GLTFLoader().load(
            modelUrl,
            (gltf) => {
                if (disposed) {
                    disposeObject(gltf.scene);
                    return;
                }

                model = gltf.scene;
                model.traverse((child) => {
                    const mesh = child as THREE.Mesh;
                    if (!mesh.isMesh) return;

                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                    // Blender's haze is a volume; the exported slab would be an
                    // opaque box around the camera, so real fog replaces it.
                    if (materials.some((m) => GROUND_FOG_MATERIAL.test(m?.name ?? ''))) {
                        mesh.visible = false;
                        return;
                    }

                    for (const material of materials) {
                        if (
                            material instanceof THREE.MeshStandardMaterial &&
                            GROUND_MATERIAL.test(material.name)
                        ) {
                            material.color.copy(toLinearColor(GROUND_ALBEDO));
                        }
                    }

                    // Fog volumes and floating motes must not block the moonlight.
                    const translucent = materials.some((m) => /mote/i.test(m?.name ?? ''));
                    mesh.castShadow = !translucent;
                    mesh.receiveShadow = true;
                });
                scene.add(model);
            },
            undefined,
            (error) => {
                console.error(`ThreeBackground: failed to load ${modelUrl}`, error);
            },
        );

        const clock = new THREE.Clock();
        let frame = 0;
        let visible = true;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const swaying = animated && !prefersReducedMotion;

        const render = () => {
            frame = requestAnimationFrame(render);
            if (!visible) return;

            const time = clock.getElapsedTime();
            pointer.lerp(pointerTarget, 0.05);

            offset.copy(baseOffset);

            if (swaying) {
                const yaw = Math.sin(time * 0.08) * 0.035 + pointer.x * 0.06;
                const pitch = Math.sin(time * 0.12) * 0.012 - pointer.y * 0.04;

                offset.applyAxisAngle(UP, yaw);
                right.crossVectors(offset, UP).normalize();
                offset.applyAxisAngle(right, pitch);

                for (const layer of mistTextures) {
                    layer.texture.offset.set(time * layer.drift, time * layer.drift * 0.6);
                }
            }

            camera.position.copy(target).add(offset);
            camera.lookAt(target);

            renderer.render(scene, camera);
        };
        render();

        const onPointerMove = (event: PointerEvent) => {
            pointerTarget.set(
                (event.clientX / window.innerWidth) * 2 - 1,
                (event.clientY / window.innerHeight) * 2 - 1,
            );
        };

        const onVisibilityChange = () => {
            visible = !document.hidden;
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            window.removeEventListener('resize', resize);
            window.removeEventListener('orientationchange', resize);
            window.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('visibilitychange', onVisibilityChange);

            if (model) {
                scene.remove(model);
                disposeObject(model);
            }

            scene.remove(mistGroup);
            for (const layer of mistTextures) layer.texture.dispose();
            disposeObject(mistGroup);

            renderer.dispose();
        };
    }, [modelUrl, fov, animated]);

    return (
        <div
            ref={wrapperRef}
            className={[styles.background, className].filter(Boolean).join(' ')}
        >
            <canvas ref={canvasRef} aria-hidden="true" />
        </div>
    );
}
