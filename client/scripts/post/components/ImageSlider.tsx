import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import React, { useState } from 'react';
import { ClipLoader } from 'react-spinners';

import { ImageSliderProps } from '../interfaces/ui.post.interface';

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const [[currIdx, direction], setState] = useState<[number, number]>([0, 0]);
  const [loaded, setLoaded] = useState<boolean[]>(Array(images.length).fill(false));

  const handlePaginate = (newDirection: number) => {
    const newIdx = (currIdx + newDirection + images.length) % images.length;
    setState([newIdx, newDirection]);
  };

  const handleImageLoad = (index: number) => {
    setLoaded((prevLoaded) => {
      const newLoaded = [...prevLoaded];
      newLoaded[index] = true;
      return newLoaded;
    });
  };

  return (
    <>
      <div className="d-flex flex-row py-4 px-4 gap-1 align-items-center">
        {/* left arrow */}
        <button
          className="border-0 bg-transparent"
          onClick={() => handlePaginate(-1)}
        >
          <FaChevronLeft size={24} color="gray" />
        </button>

        {/* image container */}
        <div
          className="position-relative mx-auto"
          style={{ width: '250px', height: '250px', overflow: 'hidden' }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            {!loaded[currIdx] && (
              <div className="d-flex justify-content-center align-items-center" style={{ width: '100%', height: '100%' }}>
                <ClipLoader size={50} color="var(--primary-color)" />
              </div>
            )}
            <motion.img
              key={currIdx}
              src={images[currIdx]}
              alt={`image-${currIdx}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4 }}
              onLoad={() => handleImageLoad(currIdx)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: loaded[currIdx] ? 'block' : 'none',
              }}
            />
          </AnimatePresence>
        </div>

        {/* right arrow */}
        <button
          className="border-0 bg-transparent"
          onClick={() => handlePaginate(1)}
        >
          <FaChevronRight size={24} color="gray" />
        </button>
      </div>

      {/* page indicator */}
      <div className="d-flex justify-content-center mt-3">
        {images.map((_, index) => (
          <div
            key={index}
            className={`image-dot ${index === currIdx ? 'active' : ''}`}
          ></div>
        ))}
      </div>
    </>
  );
};

export default ImageSlider;
