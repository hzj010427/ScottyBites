import React from 'react';
import { FaSearch, FaEdit, FaChevronRight } from 'react-icons/fa';

const ProgressBar = ({ currentStage }: { currentStage: number }) => {
  const steps = [
    { icon: <FaSearch />, label: 'Find Business' },
    { icon: <FaEdit />, label: 'Edit Post' },
  ];

  return (
    <div className="d-flex justify-content-center align-items-center mt-4">
      {steps.map((step, index) => {
        const isActive = index === currentStage;
        const isLast = index === steps.length - 1;

        return (
          <div className="d-flex align-items-center" key={index}>
            {/* Circle with icon */}
            <div
              className={`rounded-circle d-flex align-items-center justify-content-center ${
                isActive ? 'bg-primary text-white' : 'bg-light text-muted'
              }`}
              style={{ width: 40, height: 40 }}
            >
              {step.icon}
            </div>

            {/* Label */}
            <div
              className={`text-center small mt-2 ${isActive ? 'text-primary' : 'text-muted'}`}
            >
              <div style={{ width: 80 }}>{step.label}</div>
            </div>

            {/* Line to next step */}
            {!isLast && (
              <div className="mx-2 d-flex align-items-center text-muted">
                <FaChevronRight size={16} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressBar;
