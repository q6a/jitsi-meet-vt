import React from "react";

import { PrivateMessageDisplayProps } from "../types";

const PrivateMessageDisplay: React.FC<PrivateMessageDisplayProps> = ({ message }) => (
    <div
        style={{
            color: "black",
            zIndex: 5000,
            fontSize: "30px",
            position: "absolute",
            bottom: 180,
            left: 10,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#D3D3D3",
            borderRadius: 8,
        }}
    >
        {message && <p>{message}</p>}
    </div>
);

export default PrivateMessageDisplay;
