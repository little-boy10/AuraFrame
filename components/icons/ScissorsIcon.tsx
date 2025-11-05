
import React from 'react';

export const ScissorsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7.071-7.071L3 3l9.192 9.192M10.808 12l9.192 9.192-9.192-9.192z" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="6" r="3" />
    </svg>
);
