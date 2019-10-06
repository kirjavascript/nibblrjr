import React from 'react';

export default function Select({ items, ...props }) {
    return (
        <div className="select">
            <select {...props}>
                {items.map(({ label, value }) => (
                    <option
                        value={value}
                        key={value}
                    >
                        {label}
                    </option>
                ))}
            </select>
            <svg
                className="arrow"
                width="12"
                height="12"
                viewBox="0 0 100 50"
            >
                <path d="M0,0H100L50,50z" />
            </svg>
        </div>
    );
}
