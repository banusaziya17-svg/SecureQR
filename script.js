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

        result.innerHTML = `
            <p class="success">
                ✅ Message encrypted successfully!
            </p>

            <p class="encrypted-title">
                Your Secure QR Code:
            </p>

            <div id="qrcode"></div>

            <p class="encrypted-title">
                Encrypted Data:
            </p>

            <textarea readonly>${secureData}</textarea>
        `;

        // Generate QR code
        new QRCode(document.getElementById("qrcode"), {
            text: secureData,
            width: 250,
            height: 250
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
        <h1>🔓 Decode Secure QR</h1>

        <p class="subtitle">
            Upload your encrypted QR code to recover the message.
        </p>

        <div class="form-box">

            <input 
                type="file"
                id="qrFile"
                accept="image/*"
            >

            <button onclick="readQRImage()">
                📷 Read QR Code
            </button>

            <div id="qrResult"></div>

            <input
                type="password"
                id="decryptPassword"
                placeholder="Enter secret password"
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


// ---------- READ QR IMAGE ----------

let scannedQRData = "";

async function readQRImage() {

    const fileInput = document.getElementById("qrFile");
    const result = document.getElementById("qrResult");

    if (!fileInput.files.length) {

        result.innerHTML = `
            <p class="error">
                ❌ Please select a QR image first.
            </p>
        `;

        return;
    }

    const file = fileInput.files[0];

    const scanner = new Html5Qrcode("qrResult");

    try {

        const decodedText = await scanner.scanFile(file, true);

        scannedQRData = decodedText;

        result.innerHTML = `
            <p class="success">
                ✅ QR code read successfully!
            </p>
        `;

    } catch (error) {

        result.innerHTML = `
            <p class="error">
                ❌ Could not read the QR code.
                Please upload a clear QR image.
            </p>
        `;

        console.error(error);
    }
}


// ---------- DECRYPT SCANNED QR ----------

async function decryptScannedMessage() {

    const password =
        document.getElementById("decryptPassword").value;

    const result =
        document.getElementById("decryptResult");

    if (scannedQRData === "") {

        result.innerHTML = `
            <p class="error">
                ❌ Please read a QR code first.
            </p>
        `;

        return;
    }

    if (password === "") {

        result.innerHTML = `
            <p class="error">
                ❌ Please enter your password.
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
    location.reload();
}