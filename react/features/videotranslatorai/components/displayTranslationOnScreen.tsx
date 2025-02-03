import React from "react";
import { PrivateMessageDisplayProps } from "../types";

// Function to check if the message contains RTL characters
const isRTLMessage = (text: string): boolean => {
    const rtlCharPattern = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlCharPattern.test(text);
};

const PrivateMessageDisplay: React.FC<PrivateMessageDisplayProps> = ({ message }) => {
    const isRTL = message ? isRTLMessage(message) : false;

    return (
        <div
            style={{
                color: "black",
                zIndex: 5000,
                fontSize: "30px",
                position: "absolute",
                bottom: 180,
                left: isRTL ? "auto" : 10,
                right: isRTL ? 10 : "auto",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#D3D3D3",
                borderRadius: 8,
                textAlign: isRTL ? "right" : "left",
                direction: isRTL ? "rtl" : "ltr",
                padding: "5px 10px",
            }}
        >
            {message && <p>{message}</p>}
        </div>
    );
};

export default PrivateMessageDisplay;
