'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperInstance } from 'swiper';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

import styles from './styles.module.scss';

const photos = [
    { src: '/1.jpg', alt: 'Photo 1' },
    { src: '/2.jpg', alt: 'Photo 2' },
    { src: '/3.jpg', alt: 'Photo 3' },
];

const total = String(photos.length).padStart(2, '0');

export default function PhotoSlider() {
    const swiperRef = useRef<SwiperInstance | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <figure className={styles.Slider}>
            <Swiper
                className={styles.Swiper}
                loop
                speed={550}
                slidesPerView={1}
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                modules={[Autoplay]}
                autoplay={{
                    delay: 15000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                }}
                onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
            >
                {photos.map((photo, index) => (
                    <SwiperSlide key={photo.src} className={styles.Slide}>
                        <Image
                            src={photo.src}
                            alt={photo.alt}
                            fill
                            priority={index === 0}
                            sizes="(max-width: 900px) 100vw, 50vw"
                            className={styles.Image}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>

            <button
                type="button"
                className={`${styles.Nav} ${styles.Prev}`}
                onClick={() => swiperRef.current?.slidePrev()}
                aria-label="Previous photo"
            >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
                </svg>
            </button>

            <button
                type="button"
                className={`${styles.Nav} ${styles.Next}`}
                onClick={() => swiperRef.current?.slideNext()}
                aria-label="Next photo"
            >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
                </svg>
            </button>

            <span className={styles.Counter} aria-hidden="true">
                {String(activeIndex + 1).padStart(2, '0')} / {total}
            </span>
        </figure>
    );
}
