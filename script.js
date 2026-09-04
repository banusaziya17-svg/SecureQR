// ===============================
// SECURE QR MESSAGE APPLICATION
// ===============================


// ---------- ENCRYPT SCREEN ----------

function showEncrypt() {
    document.querySelector(".container").innerHTML = `
        <h1>🔐 Create Secure Message</h1>

        <p class="subtitle">
            Encrypt your secret message using AES-GCM encryption.
        </p>

        <div class="form-box">

            <textarea 
                id="message" 
                placeholder="Enter your secret message..."
            ></textarea>

            <input 
                type="password" 
                id="password" 
                placeholder="Enter secret password"
            >

            <button onclick="encryptMessage()">
                🔒 Encrypt Message
            </button>

            <button onclick="goHome()">
                ← Back to Home
            </button>

            <div id="result"></div>

        </div>
    `;
}


// ---------- PASSWORD → ENCRYPTION KEY ----------

async function createKey(password, salt) {

    const encoder = new TextEncoder();

    const passwordData = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
        "raw",
        passwordData,
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}


// ---------- ENCRYPT MESSAGE ----------

async function encryptMessage() {

    const message = document.getElementById("message").value;
    const password = document.getElementById("password").value;
    const result = document.getElementById("result");

    if (message === "" || password === "") {

        result.innerHTML = `
            <p class="error">
                ❌ Please enter both message and password.
            </p>
        `;

        return;
    }

    try {

        const encoder = new TextEncoder();

        // Create random salt
        const salt = crypto.getRandomValues(
            new Uint8Array(16)
        );

        // Create random initialization vector
        const iv = crypto.getRandomValues(
            new Uint8Array(12)
        );

        // Create encryption key
        const key = await createKey(password, salt);

        // Encrypt message
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encoder.encode(message)
        );

        // Convert encrypted data to Base64
        const encryptedArray = new Uint8Array(encryptedData);

        const encryptedBase64 = btoa(
            String.fromCharCode(...encryptedArray)
        );

        const saltBase64 = btoa(
            String.fromCharCode(...salt)
        );

        const ivBase64 = btoa(
            String.fromCharCode(...iv)
        );

        // Store everything needed for decryption
        const secureData = JSON.stringify({
            encrypted: encryptedBase64,
            salt: saltBase64,
            iv: ivBase64
        });


        // ==========================================
        // CREATE LINK FOR PHONE
        // ==========================================

        const appURL =
            "https://banusaziya17-svg.github.io/SecureQR/";

        const secureURL =
            appURL + "?data=" + encodeURIComponent(secureData);


        result.innerHTML = `
            <p class="success">
                ✅ Message encrypted successfully!
            </p>

            <p class="encrypted-title">
                📱 Scan this QR with a phone:
            </p>

            <div id="qrcode"></div>

            <p class="encrypted-title">
                🔒 Encrypted Data:
            </p>

            <textarea readonly>${secureData}</textarea>
        `;


        // Generate QR containing the app link + encrypted data
        new QRCode(document.getElementById("qrcode"), {
            text: secureURL,
            width: 300,
            height: 300
        });

    } catch (error) {

        result.innerHTML = `
            <p class="error">
                ❌ Encryption failed.
            </p>
        `;

        console.error(error);
    }
}


// ---------- DECRYPT SCREEN ----------

function showDecrypt() {

    document.querySelector(".container").innerHTML = `
        <h1>🔓 Secure Message Received</h1>

        <p class="subtitle">
            An encrypted message has been received through the QR code.
        </p>

        <div class="form-box">

            <div id="qrReceived"></div>

            <input
                type="password"
                id="decryptPassword"
                placeholder="Enter the secret password"
            >

            <button onclick="decryptScannedMessage()">
                🔓 Decrypt Message
            </button>

            <button onclick="goHome()">
                ← Back to Home
            </button>

            <div id="decryptResult"></div>

        </div>
    `;
}


// ---------- DATA RECEIVED FROM QR ----------

let scannedQRData = "";

function loadQRDataFromURL() {

    const params = new URLSearchParams(window.location.search);

    const data = params.get("data");

    if (data) {

        scannedQRData = data;

        showDecrypt();
    }
}


// ---------- DECRYPT MESSAGE ----------

async function decryptScannedMessage() {

    const password =
        document.getElementById("decryptPassword").value;

    const result =
        document.getElementById("decryptResult");


    if (scannedQRData === "") {

        result.innerHTML = `
            <p class="error">
                ❌ No encrypted message found.
            </p>
        `;

        return;
    }


    if (password === "") {

        result.innerHTML = `
            <p class="error">
                ❌ Please enter the password.
            </p>
        `;

        return;
    }


    try {

        const data = JSON.parse(scannedQRData);


        const encryptedArray = Uint8Array.from(
            atob(data.encrypted),
            c => c.charCodeAt(0)
        );


        const salt = Uint8Array.from(
            atob(data.salt),
            c => c.charCodeAt(0)
        );


        const iv = Uint8Array.from(
            atob(data.iv),
            c => c.charCodeAt(0)
        );


        // Recreate encryption key
        const key = await createKey(password, salt);


        // Decrypt message
        const decryptedData =
            await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encryptedArray
            );


        const decoder = new TextDecoder();

        const originalMessage =
            decoder.decode(decryptedData);


        result.innerHTML = `
            <p class="success">
                ✅ Message decrypted successfully!
            </p>

            <p class="encrypted-title">
                🔓 Original Secret Message:
            </p>

            <div class="original-message">
                ${escapeHTML(originalMessage)}
            </div>
        `;


    } catch (error) {

        result.innerHTML = `
            <p class="error">
                ❌ Incorrect password or invalid QR code.
            </p>
        `;

        console.error(error);
    }
}


// ---------- SECURITY HELPER ----------

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ---------- GO HOME ----------

function goHome() {

    window.location.href =
        "https://banusaziya17-svg.github.io/SecureQR/";
}


// ---------- CHECK FOR QR DATA ----------

window.addEventListener(
    "DOMContentLoaded",
    loadQRDataFromURL
);
