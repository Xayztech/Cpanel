// Impor library yang dibutuhkan
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// --- Middleware (Perantara) ---
app.use(cors()); // Izinkan permintaan dari frontend
app.use(express.json()); // Izinkan server menerima data format JSON

// --- KONFIGURASI WAJIB DIGANTI ---
const PTERO_DOMAIN = 'https://xayz-tech.ismypanel.com';  // URL Panel Pterodactyl Anda
const PTERO_APP_KEY = 'ptla_XXXXXXXXXXXXXXXXXXXXXX'; // GANTI DENGAN APPLICATION API KEY ANDA!
const NODEJS_EGG_ID = 15;                             // GANTI DENGAN ID EGG NODE.JS ANDA!
const LOCATION_ID = 1;                                // GANTI DENGAN ID LOKASI ANDA

// --- DATABASE SIMULASI ---
let users = {
    "admin": { role: "admin", licenseKey: "adminpass", expiresAt: null },
    "user": { role: "user", licenseKey: "userpass", expiresAt: null }
};

// Middleware untuk memverifikasi token sesi
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        req.token = bearerToken;
        next(); // Lanjutkan ke fungsi selanjutnya
    } else {
        res.status(403).json({ success: false, message: 'Akses ditolak, token tidak ditemukan' });
    }
}

// === API ENDPOINTS ===

// Endpoint untuk Login
app.post('/login', (req, res) => {
    const { username, licenseKey } = req.body;
    const user = users[username];

    if (!user || user.licenseKey !== licenseKey) {
        return res.status(401).json({ success: false, message: 'Username atau Key License salah.' });
    }

    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        return res.status(403).json({ success: false, message: 'Lisensi Anda telah kedaluwarsa.' });
    }
    
    const token = username; 
    res.status(200).json({ success: true, role: user.role, token: token });
});

// Endpoint untuk Membuat User & Lisensi (Hanya Admin)
app.post('/admin/create-user', verifyToken, (req, res) => {
    if (req.token !== 'admin') {
        return res.status(403).json({ success: false, message: 'Akses ditolak, hanya admin.' });
    }

    const { newUsername, expiryDays } = req.body;
    if (users[newUsername]) {
        return res.status(400).json({ success: false, message: 'Username sudah ada.' });
    }

    const newLicenseKey = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

    users[newUsername] = {
        role: 'user',
        licenseKey: newLicenseKey,
        expiresAt: expiresAt.toISOString()
    };
    
    console.log("User baru ditambahkan:", users[newUsername]);
    res.status(201).json({ 
        success: true, 
        username: newUsername, 
        licenseKey: newLicenseKey, 
        expiresAt: users[newUsername].expiresAt 
    });
});

// Endpoint untuk Membuat Server Bot
app.post('/create-bot', verifyToken, async (req, res) => {
    const { botUsername, botPassword, cpu, ram, disk } = req.body;
    
    const cpuLimit = parseInt(cpu);
    const ramLimit = parseInt(ram);
    const diskLimit = parseInt(disk);

    if (isNaN(cpuLimit) || isNaN(ramLimit) || isNaN(diskLimit) || cpuLimit < 0 || ramLimit < 0 || diskLimit < 0) {
        return res.status(400).json({ success: false, message: 'Input resource tidak valid. Harus angka positif.' });
    }

    try {
        // Langkah 1: Buat User di Pterodactyl
        const userApiResponse = await axios.post(`${PTERO_DOMAIN}/api/application/users`, 
            {
                email: `${botUsername}@mybot.host`, // Buat email unik
                username: botUsername,
                first_name: botUsername,
                last_name: 'BotUser',
                password: botPassword,
                root_admin: false,
            },
            {
                headers: { 'Authorization': `Bearer ${PTERO_APP_KEY}` }
            }
        );
        const userId = userApiResponse.data.attributes.id;

        // Langkah 2: Buat Server dengan konfigurasi canggih
        const startupCommand = 'if [[ -d .git ]] && [[ ${AUTO_UPDATE} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

        const serverData = {
            name: `Bot-${botUsername}`,
            user: userId,
            egg: NODEJS_EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_21",
            startup: startupCommand,
            environment: { 
                INST: "npm", 
                USER_UPLOAD: "0", 
                AUTO_UPDATE: "0", 
                CMD_RUN: "npm start"
            },
            limits: { 
                memory: ramLimit, 
                swap: 0, 
                disk: diskLimit, 
                io: 500, 
                cpu: cpuLimit 
            },
            feature_limits: {
                databases: 5, 
                allocations: 5, 
                backups: 5 
            },
            deploy: { 
                locations: [LOCATION_ID], 
                dedicated_ip: false, 
                port_range: [] 
            }
        };

        await axios.post(`${PTERO_DOMAIN}/api/application/servers`, serverData, {
            headers: { 'Authorization': `Bearer ${PTERO_APP_KEY}` }
        });

        res.status(201).json({ success: true, message: 'Hosting bot berhasil dibuat!' });

    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data.errors) : error.message;
        console.error("Error dari Pterodactyl API:", errorMsg);
        res.status(500).json({ success: false, message: `Gagal berkomunikasi dengan Pterodactyl. Error: ${errorMsg}` });
    }
});

// Menjalankan server backend
app.listen(PORT, () => {
    console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
});
