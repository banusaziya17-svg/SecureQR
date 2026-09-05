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

        // Random salt
        const salt = crypto.getRandomValues(
            new Uint8Array(16)
        );

        // Random IV
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

        // Convert to Base64
        const encryptedBase64 = btoa(
            String.fromCharCode(
                ...new Uint8Array(encryptedData)
            )
        );

        const saltBase64 = btoa(
            String.fromCharCode(...salt)
        );

        const ivBase64 = btoa(
            String.fromCharCode(...iv)
        );


        // ==========================================
        // SAVE ENCRYPTED DATA TO FIRESTORE
        // ==========================================

        const docRef = await db.collection("messages").add({
            encrypted: encryptedBase64,
            salt: saltBase64,
            iv: ivBase64,
            createdAt: new Date().toISOString()
        });


        // ==========================================
        // CREATE SHORT QR LINK
        // ==========================================

        const appURL =
            "https://banusaziya17-svg.github.io/SecureQR/";

        const secureURL =
            appURL + "?id=" + docRef.id;


        result.innerHTML = `
            <p class="success">
                ✅ Message encrypted successfully!
            </p>

            <p class="encrypted-title">
                📱 Scan this QR with a phone:
            </p>

            <div id="qrcode"></div>

            <p class="encrypted-title">
                🔒 Secure Message ID:
            </p>

            <p>${docRef.id}</p>
        `;


        // Generate QR
        new QRCode(
            document.getElementById("qrcode"),
            {
                text: secureURL,
                width: 300,
                height: 300
            }
        );


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
            Encrypted message received through QR code.
        </p>

        <div class="form-box">

            <p id="loadingMessage">
                🔄 Loading secure message...
            </p>

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


// ---------- FIRESTORE DATA ----------

let scannedQRData = "";


// ---------- LOAD DATA FROM QR ID ----------

async function loadQRDataFromURL() {

    const params = new URLSearchParams(
        window.location.search
    );

    const id = params.get("id");

    if (!id) {
        return;
    }

    scannedQRData = id;

    showDecrypt();

    try {

        const doc = await db
            .collection("messages")
            .doc(id)
            .get();

        const loading =
            document.getElementById("loadingMessage");

        if (!doc.exists) {

            loading.innerHTML = `
                ❌ Secure message not found.
            `;

            return;
        }

        loading.innerHTML = `
            ✅ Secure message received.
            <br>
            Enter the password to decrypt it.
        `;

    } catch (error) {

        console.error(error);

        document.getElementById(
            "loadingMessage"
        ).innerHTML = `
            ❌ Could not load secure message.
        `;
    }
}


// ---------- DECRYPT MESSAGE ----------

async function decryptScannedMessage() {

    const password =
        document.getElementById(
            "decryptPassword"
        ).value;

    const result =
        document.getElementById(
            "decryptResult"
        );


    if (scannedQRData === "") {

        result.innerHTML = `
            <p class="error">
                ❌ No secure message found.
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

        // Get encrypted data from Firestore
        const doc = await db
            .collection("messages")
            .doc(scannedQRData)
            .get();


        if (!doc.exists) {

            result.innerHTML = `
                <p class="error">
                    ❌ Secure message not found.
                </p>
            `;

            return;
        }


        const data = doc.data();


        // Convert Base64 back to bytes
        const encryptedArray =
            Uint8Array.from(
                atob(data.encrypted),
                c => c.charCodeAt(0)
            );


        const salt =
            Uint8Array.from(
                atob(data.salt),
                c => c.charCodeAt(0)
            );


        const iv =
            Uint8Array.from(
                atob(data.iv),
                c => c.charCodeAt(0)
            );


        // Recreate encryption key
        const key =
            await createKey(
                password,
                salt
            );


        // Decrypt
        const decryptedData =
            await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                key,
                encryptedArray
            );


        const decoder =
            new TextDecoder();


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
                ❌ Incorrect password or invalid secure message.
            </p>
        `;

        console.error(error);
    }
}


// ---------- SECURITY HELPER ----------

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// ---------- GO HOME ----------

function goHome() {

    window.location.href =
        "https://banusaziya17-svg.github.io/SecureQR/";
}


// ---------- CHECK QR DATA ----------

window.addEventListener(
    "DOMContentLoaded",
    loadQRDataFromURL
);
