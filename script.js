document.addEventListener('DOMContentLoaded', () => {
    // Referensi ke elemen-elemen HTML
    const loginView = document.getElementById('login-view');
    const userView = document.getElementById('user-view');
    const adminView = document.getElementById('admin-view');
    const resultContainer = document.getElementById('result-container');
    const resultTableBody = document.querySelector('#result-table tbody');

    // Referensi ke form
    const loginForm = document.getElementById('login-form');
    const createBotForm = document.getElementById('create-bot-form');
    const createUserForm = document.getElementById('create-user-form');
    
    // Referensi ke tombol logout
    const logoutUserBtn = document.getElementById('logout-user');
    const logoutAdminBtn = document.getElementById('logout-admin');

    // Alamat server backend Anda
    const backendUrl = 'http://localhost:3000';

    // Event listener untuk form login
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const licenseKey = document.getElementById('license-key').value;

        try {
            const response = await fetch(`${backendUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, licenseKey })
            });
            
            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('authToken', data.token); // Simpan token sesi
                loginView.classList.add('hidden');
                
                if (data.role === 'admin') {
                    adminView.classList.remove('hidden');
                } else {
                    userView.classList.remove('hidden');
                    resultContainer.classList.remove('hidden');
                }
            } else {
                alert(`Gagal Login: ${data.message}`);
            }
        } catch (error) {
            console.error('Error saat login:', error);
            alert('Tidak dapat terhubung ke server. Pastikan server backend berjalan.');
        }
    });

    // Event listener untuk form pembuatan bot
    createBotForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const botUsername = document.getElementById('bot-username').value;
        const botPassword = document.getElementById('bot-password').value;
        const cpu = document.getElementById('bot-cpu').value;
        const ram = document.getElementById('bot-ram').value;
        const disk = document.getElementById('bot-disk').value;
        const token = sessionStorage.getItem('authToken');

        const newRow = resultTableBody.insertRow(0); // Tambah baris di paling atas
        const cellUsername = newRow.insertCell(0);
        const cellCpu = newRow.insertCell(1);
        const cellRam = newRow.insertCell(2);
        const cellDisk = newRow.insertCell(3);
        const cellStatus = newRow.insertCell(4);

        cellUsername.textContent = botUsername;
        cellCpu.textContent = cpu == 0 ? 'Unlimited' : `${cpu}%`;
        cellRam.textContent = ram == 0 ? 'Unlimited' : `${ram} MB`;
        cellDisk.textContent = disk == 0 ? 'Unlimited' : `${disk} MB`;
        cellStatus.textContent = 'Memproses...';

        try {
            const response = await fetch(`${backendUrl}/create-bot`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ botUsername, botPassword, cpu, ram, disk })
            });

            const data = await response.json();

            if (response.ok) {
                cellStatus.textContent = 'Sukses';
                cellStatus.style.color = '#4caf50';
            } else {
                cellStatus.textContent = `Gagal: ${data.message}`;
                cellStatus.style.color = '#f44336';
            }
        } catch (error) {
            console.error('Error saat membuat bot:', error);
            cellStatus.textContent = 'Error koneksi';
            cellStatus.style.color = '#f44336';
        }

        createBotForm.reset();
    });

    // Event listener untuk form pembuatan user (admin)
    createUserForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const newUsername = document.getElementById('new-username').value;
        const expiryDays = document.getElementById('expiry-days').value;
        const token = sessionStorage.getItem('authToken');

        try {
            const response = await fetch(`${backendUrl}/admin/create-user`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newUsername, expiryDays })
            });

            const data = await response.json();
            
            if (response.ok) {
                 alert(`Sukses!\nUsername: ${data.username}\nKey License: ${data.licenseKey}\nBerlaku sampai: ${new Date(data.expiresAt).toLocaleString('id-ID')}`);
            } else {
                alert(`Gagal: ${data.message}`);
            }
        } catch (error) {
            console.error('Error saat membuat user:', error);
            alert('Tidak dapat terhubung ke server.');
        }

        createUserForm.reset();
    });
    
    // Fungsi untuk logout
    function logout() {
        sessionStorage.removeItem('authToken');
        userView.classList.add('hidden');
        adminView.classList.add('hidden');
        resultContainer.classList.add('hidden');
        loginView.classList.remove('hidden');
        resultTableBody.innerHTML = '';
    }
    
    logoutUserBtn.addEventListener('click', logout);
    logoutAdminBtn.addEventListener('click', logout);
});