import React, { useState } from 'react';

import { TooltipWrapperProps } from '../interfaces/ui.post.interface';

const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  helperTxt,
  children,
}) => {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="position-relative d-inline-block"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {children}
      {hovering && (
        <div className="tooltip-position position-absolute bg-dark text-white py-1 px-2 rounded small">
          {helperTxt}
        </div>
      )}
    </div>
  );
};

export default TooltipWrapper;
