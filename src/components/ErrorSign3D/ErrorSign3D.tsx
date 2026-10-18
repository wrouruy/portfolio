'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './styles.module.scss';

// ---------------------------------------------------------------------------
// A self-contained three.js scene: a warning road sign with an exclamation
// mark on a post. Deliberately built from primitives and canvas textures, with
// no .glb, no fonts and no network requests - an error screen must not depend
// on the very things that just failed.
// ---------------------------------------------------------------------------

/** Bounding box of the triangular board, in world units. */
const SIGN_WIDTH = 2.86;
const SIGN_HEIGHT = (SIGN_WIDTH * Math.sqrt(3)) / 2;
const SIGN_CORNER_RADIUS = 0.32;
const SIGN_DEPTH = 0.09;
const SIGN_BEVEL = 0.035;

/** The pole the board is bolted to. */
const POST_HEIGHT = 2.1;
const POST_RADIUS = 0.075;

/** Placement of the board (its centre) and the camera framing of the prop. */
const BOARD_CENTER_Y = 3.2;
const CONTENT_CENTER_Y = 2.25;
const CONTENT_HEIGHT = 4.7;
const CONTENT_WIDTH = 3.4;
const FRAMING_MARGIN = 1.12;

const CAMERA_FOV = 30;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;

/** Idle pose: turned a little, so the board's thickness reads as 3D. */
const BASE_YAW = -0.26;
const BASE_PITCH = 0.03;

const TEXTURE_SIZE = 1024;
// Fraction of the canvas left empty around the triangle.
const CANVAS_MARGIN_RATIO = 0.035;
// The board texture is a square whose triangle spans (1 - 2 * margin) of it,
// so the plane has to be a touch larger than the board itself.
const PLANE_SIZE = SIGN_WIDTH / (1 - 2 * CANVAS_MARGIN_RATIO);

const SIGN_RED = '#e3261c';
const SIGN_BLACK = '#17171a';
const BOARD_COLOR = '#3c4149';
const POST_COLOR = '#565c66';

// three r151 still uses the legacy colour-space API (`outputEncoding` /
// `Texture.encoding`), which the installed (r186) typings no longer declare.
const S_RGB_ENCODING = 3001;

const applySrgbOutput = (renderer: THREE.WebGLRenderer) => {
    const legacy = renderer as THREE.WebGLRenderer & { outputEncoding?: number };
    if ('outputEncoding' in legacy) legacy.outputEncoding = S_RGB_ENCODING;
};

const applySrgbTexture = (texture: THREE.Texture) => {
    const legacy = texture as THREE.Texture & { encoding?: number };
    if ('encoding' in legacy) legacy.encoding = S_RGB_ENCODING;
};

/** Equilateral triangle, centroid at the origin, apex pointing up. */
const SIGN_TRIANGLE: Array<[number, number]> = [
    [0, (SIGN_HEIGHT * 2) / 3],
    [SIGN_WIDTH / 2, -SIGN_HEIGHT / 3],
    [-SIGN_WIDTH / 2, -SIGN_HEIGHT / 3],
];

/** Rounded polygon as a canvas path, for the 2D sign artwork. */
function roundedPath(
    context: CanvasRenderingContext2D,
    points: Array<[number, number]>,
    corner: number,
) {
    context.beginPath();

    points.forEach((_, index) => {
        const current = points[index];
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];

        const toPrevious = [previous[0] - current[0], previous[1] - current[1]] as const;
        const toNext = [next[0] - current[0], next[1] - current[1]] as const;
        const lengthPrevious = Math.hypot(toPrevious[0], toPrevious[1]);
        const lengthNext = Math.hypot(toNext[0], toNext[1]);
        const radius = Math.min(corner, lengthPrevious / 2, lengthNext / 2);

        const entry = [
            current[0] + (toPrevious[0] / lengthPrevious) * radius,
            current[1] + (toPrevious[1] / lengthPrevious) * radius,
        ] as const;
        const exit = [
            current[0] + (toNext[0] / lengthNext) * radius,
            current[1] + (toNext[1] / lengthNext) * radius,
        ] as const;

        if (index === 0) context.moveTo(entry[0], entry[1]);
        else context.lineTo(entry[0], entry[1]);

        context.arcTo(current[0], current[1], exit[0], exit[1], radius);
    });

    context.closePath();
}

/** Rounded polygon as a THREE.Shape, for the extruded board. */
function roundedShape(points: Array<[number, number]>, corner: number): THREE.Shape {
    const shape = new THREE.Shape();

    points.forEach((_, index) => {
        const current = points[index];
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];

        const toPrevious = [previous[0] - current[0], previous[1] - current[1]] as const;
        const toNext = [next[0] - current[0], next[1] - current[1]] as const;
        const lengthPrevious = Math.hypot(toPrevious[0], toPrevious[1]);
        const lengthNext = Math.hypot(toNext[0], toNext[1]);
        const radius = Math.min(corner, lengthPrevious / 2, lengthNext / 2);

        const entry = [
            current[0] + (toPrevious[0] / lengthPrevious) * radius,
            current[1] + (toPrevious[1] / lengthPrevious) * radius,
        ] as const;
        const exit = [
            current[0] + (toNext[0] / lengthNext) * radius,
            current[1] + (toNext[1] / lengthNext) * radius,
        ] as const;

        if (index === 0) shape.moveTo(entry[0], entry[1]);
        else shape.lineTo(entry[0], entry[1]);

        shape.quadraticCurveTo(current[0], current[1], exit[0], exit[1]);
    });

    shape.closePath();

    return shape;
}

/** Red ring, white face and a big black "!" - drawn, never downloaded. */
function createSignTexture(): THREE.CanvasTexture | null {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;

    const context = canvas.getContext('2d');
    if (!context) return null;

    const margin = TEXTURE_SIZE * CANVAS_MARGIN_RATIO;
    const base = TEXTURE_SIZE - margin * 2;
    const height = (base * Math.sqrt(3)) / 2;
    const top = (TEXTURE_SIZE - height) / 2;
    const bottom = top + height;

    const outer: Array<[number, number]> = [
        [TEXTURE_SIZE / 2, top],
        [TEXTURE_SIZE - margin, bottom],
        [margin, bottom],
    ];

    const centroid: [number, number] = [
        (outer[0][0] + outer[1][0] + outer[2][0]) / 3,
        (outer[0][1] + outer[1][1] + outer[2][1]) / 3,
    ];

    // The white face is the same triangle pulled towards its centroid.
    const innerScale = 0.8;
    const inner = outer.map(
        ([x, y]) =>
            [
                centroid[0] + (x - centroid[0]) * innerScale,
                centroid[1] + (y - centroid[1]) * innerScale,
            ] as [number, number],
    );

    context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

    roundedPath(context, outer, base * 0.09);
    context.fillStyle = SIGN_RED;
    context.fill();

    roundedPath(context, inner, base * 0.06);
    const face = context.createLinearGradient(0, top, 0, bottom);
    face.addColorStop(0, '#ffffff');
    face.addColorStop(1, '#ececec');
    context.fillStyle = face;
    context.fill();

    const fontSize = base * 0.54;
    context.fillStyle = SIGN_BLACK;
    context.font = `900 ${fontSize}px Arial, "Helvetica Neue", Helvetica, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('!', TEXTURE_SIZE / 2, centroid[1] + fontSize * 0.03);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    applySrgbTexture(texture);

    return texture;
}

/** Radial red haze that gives the board a glow against the dark background. */
function createGlowTexture(): THREE.CanvasTexture | null {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(227, 38, 28, 0.55)');
    gradient.addColorStop(0.45, 'rgba(227, 38, 28, 0.16)');
    gradient.addColorStop(1, 'rgba(227, 38, 28, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    applySrgbTexture(texture);

    return texture;
}

/** Soft contact shadow under the post, so the sign is not floating. */
function createShadowTexture(): THREE.CanvasTexture | null {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
}

interface Props {
    /** Idle sway and pointer parallax. Disabled automatically when the user
     * prefers reduced motion. */
    animated?: boolean;
    /** Extra class names for the wrapper. */
    className?: string;
}

export default function ErrorSign3D({ animated = true, className }: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Shown imperatively if WebGL is unavailable, so the screen degrades to a
    // flat CSS sign without a re-render.
    const fallbackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;
        if (!wrapper || !canvas) return;

        let renderer: THREE.WebGLRenderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true, // the CSS gradient behind stays visible
                powerPreference: 'high-performance',
            });
        } catch (error) {
            console.error('ErrorSign3D: WebGL is not available', error);
            if (fallbackRef.current) fallbackRef.current.hidden = false;
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        applySrgbOutput(renderer);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);

        const root = new THREE.Group();
        root.rotation.set(BASE_PITCH, BASE_YAW, 0);
        scene.add(root);

        const contentCenter = new THREE.Vector3(0, CONTENT_CENTER_Y, 0);

        const fitCamera = () => {
            const verticalFov = THREE.MathUtils.degToRad(CAMERA_FOV);
            const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
            const distanceVertical = CONTENT_HEIGHT / 2 / Math.tan(verticalFov / 2);
            const distanceHorizontal = CONTENT_WIDTH / 2 / Math.tan(horizontalFov / 2);

            camera.position.set(
                0,
                contentCenter.y + 0.25,
                Math.max(distanceVertical, distanceHorizontal) * FRAMING_MARGIN,
            );
            camera.lookAt(contentCenter);
        };

        // --- board -------------------------------------------------------
        const boardGeometry = new THREE.ExtrudeGeometry(
            roundedShape(SIGN_TRIANGLE, SIGN_CORNER_RADIUS),
            {
                depth: SIGN_DEPTH,
                bevelEnabled: true,
                bevelThickness: SIGN_BEVEL,
                bevelSize: SIGN_BEVEL,
                bevelSegments: 2,
                curveSegments: 12,
            },
        );
        boardGeometry.computeBoundingBox();
        const boardBox = boardGeometry.boundingBox!;
        const boardDepth = boardBox.max.z - boardBox.min.z;
        // Centre the geometry, so the front artwork can sit on the front face.
        boardGeometry.translate(
            -(boardBox.min.x + boardBox.max.x) / 2,
            -(boardBox.min.y + boardBox.max.y) / 2,
            -(boardBox.min.z + boardBox.max.z) / 2,
        );

        const board = new THREE.Mesh(
            boardGeometry,
            new THREE.MeshStandardMaterial({
                color: BOARD_COLOR,
                roughness: 0.42,
                metalness: 0.65,
            }),
        );

        const artTexture = createSignTexture();
        const art = artTexture
            ? new THREE.Mesh(
                  new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE),
                  new THREE.MeshBasicMaterial({
                      map: artTexture,
                      transparent: true,
                      depthWrite: false,
                      toneMapped: false,
                      polygonOffset: true,
                      polygonOffsetFactor: -2,
                      polygonOffsetUnits: -2,
                  }),
              )
            : null;

        if (art) art.position.z = boardDepth / 2 + 0.004;

        const boardGroup = new THREE.Group();
        boardGroup.position.y = BOARD_CENTER_Y;
        boardGroup.add(board);
        if (art) boardGroup.add(art);
        root.add(boardGroup);

        // --- post and base ----------------------------------------------
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, POST_HEIGHT, 24),
            new THREE.MeshStandardMaterial({
                color: POST_COLOR,
                roughness: 0.35,
                metalness: 0.85,
            }),
        );
        post.position.y = POST_HEIGHT / 2;
        root.add(post);

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(POST_RADIUS * 4.2, POST_RADIUS * 4.8, 0.1, 32),
            new THREE.MeshStandardMaterial({
                color: '#2b2f36',
                roughness: 0.5,
                metalness: 0.6,
            }),
        );
        base.position.y = 0.05;
        root.add(base);

        // --- glow and contact shadow ------------------------------------
        const glowTexture = createGlowTexture();
        let glow: THREE.Sprite | null = null;
        if (glowTexture) {
            glow = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: glowTexture,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    opacity: 0.75,
                }),
            );
            glow.position.set(0, BOARD_CENTER_Y, -0.9);
            glow.scale.set(7, 7, 1);
            root.add(glow);
        }

        const shadowTexture = createShadowTexture();
        if (shadowTexture) {
            const shadow = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({
                    map: shadowTexture,
                    transparent: true,
                    depthWrite: false,
                    opacity: 0.7,
                }),
            );
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.set(0, 0.012, 0);
            shadow.scale.set(3.2, 1.8, 1);
            root.add(shadow);
        }

        // --- lighting ----------------------------------------------------
        scene.add(new THREE.HemisphereLight(0x2a3350, 0x08090c, 1.1));

        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(3.5, 6, 4.5);
        scene.add(key);

        const fill = new THREE.DirectionalLight(0x8fb6ff, 0.8);
        fill.position.set(-4, 1.5, 2);
        scene.add(fill);

        // Red rim from behind, echoing the sign.
        const rim = new THREE.PointLight(0xff3b30, 12, 0, 2);
        rim.position.set(-1.8, 3.6, -1.6);
        scene.add(rim);

        // --- lifecycle ---------------------------------------------------
        const resize = () => {
            const width = wrapper.clientWidth;
            const height = wrapper.clientHeight;
            if (!width || !height) return;

            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            fitCamera();
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(wrapper);
        window.addEventListener('orientationchange', resize);
        resize();

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const motion = animated && !prefersReducedMotion;

        let visible = true;
        let intersecting = true;

        const pointer = new THREE.Vector2();
        const pointerTarget = new THREE.Vector2();

        const onPointerMove = (event: PointerEvent) => {
            pointerTarget.set(
                (event.clientX / window.innerWidth) * 2 - 1,
                (event.clientY / window.innerHeight) * 2 - 1,
            );
        };
        if (motion) window.addEventListener('pointermove', onPointerMove, { passive: true });

        const onVisibilityChange = () => {
            visible = !document.hidden;
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        const intersectionObserver = new IntersectionObserver(
            ([entry]) => {
                intersecting = entry.isIntersecting;
            },
            { threshold: 0 },
        );
        intersectionObserver.observe(wrapper);

        const clock = new THREE.Clock();
        let frame = 0;

        const render = () => {
            frame = requestAnimationFrame(render);
            if (!visible || !intersecting) return;

            const time = clock.getElapsedTime();
            pointer.lerp(pointerTarget, 0.06);

            root.rotation.y = BASE_YAW + pointer.x * 0.18 + (motion ? Math.sin(time * 0.55) * 0.035 : 0);
            root.rotation.x = BASE_PITCH - pointer.y * 0.08 + (motion ? Math.sin(time * 0.8) * 0.02 : 0);
            root.rotation.z = motion ? Math.sin(time * 0.45) * 0.012 : 0;
            root.position.y = motion ? Math.sin(time * 0.7) * 0.03 : 0;

            if (glow) glow.material.opacity = 0.75 + (motion ? Math.sin(time * 0.9) * 0.1 : 0);

            renderer.render(scene, camera);
        };
        render();

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            window.removeEventListener('orientationchange', resize);
            window.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('visibilitychange', onVisibilityChange);

            // Covers both meshes and the glow sprite.
            scene.traverse((child) => {
                const object = child as THREE.Object3D & {
                    geometry?: THREE.BufferGeometry;
                    material?: THREE.Material | THREE.Material[];
                };

                object.geometry?.dispose();

                const materials = object.material
                    ? Array.isArray(object.material)
                        ? object.material
                        : [object.material]
                    : [];

                for (const material of materials) {
                    const mapped = material as THREE.Material & { map?: THREE.Texture | null };
                    mapped.map?.dispose();
                    material.dispose();
                }
            });

            renderer.dispose();
        };
    }, [animated]);

    return (
        <div ref={wrapperRef} className={[styles.scene, className].filter(Boolean).join(' ')}>
            <canvas ref={canvasRef} aria-hidden="true" />

            <div ref={fallbackRef} className={styles.fallback} aria-hidden="true" hidden>
                <div className={styles.fallbackSign}>
                    <span>!</span>
                </div>
            </div>
        </div>
    );
}
