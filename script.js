document.addEventListener('DOMContentLoaded', () => {
    // --- Umumiy DOM elementlari ---
    // Captcha elementlari olib tashlanganligi sababli ularning o'zgaruvchilari ham yo'q
    // const captchaOverlay = document.getElementById('captcha-overlay');
    // const captchaNumberSpan = document.getElementById('captcha-number');
    // const refreshCaptchaButton = document.getElementById('refresh-captcha');
    // const captchaInput = document.getElementById('captcha-input');
    // const verifyCaptchaButton = document.getElementById('verify-captcha');
    // const captchaMessage = document.getElementById('captcha-message');

    const contestListSection = document.getElementById('contest-list-section');
    const contestDetailSection = document.getElementById('contest-detail-section');
    const spinWheelSection = document.getElementById('spin-wheel-section');
    const profileSection = document.getElementById('profile-section');
    const adminPanelSection = document.getElementById('admin-panel-section'); 

    const contestListContainer = document.getElementById('contest-list');
    const contestDetailContent = document.getElementById('contest-detail-content');
    const backToListButton = document.getElementById('back-to-list');

    const showAllContestsNav = document.getElementById('show-all-contests');
    const showSpinWheelNav = document.getElementById('show-spin-wheel');
    const showProfileNav = document.getElementById('show-profile'); 
    const showAdminPanelNav = document.getElementById('show-admin-panel'); 

    const loadingMessage = document.getElementById('loading-message');
    const noContestsMessage = document.getElementById('no-contests-message');

    // --- Spin Wheel elementlari ---
    const wheelCanvas = document.getElementById('wheelCanvas');
    const spinButton = document.getElementById('spinButton');
    const spinResult = document.getElementById('spinResult');
    const currentBalanceSpan = document.getElementById('currentBalance');
    const freeSpinsTodaySpan = document.getElementById('freeSpinsToday');
    const extraSpinsSpan = document.getElementById('extraSpins');
    const dailyLimitSpan = document.getElementById('dailyLimit');

    const ctx = wheelCanvas.getContext('2d');
    let wheelDeg = 0;
    let spinning = false;
    let prizesData = []; 
    let currentUserId = null; // Foydalanuvchi ID'si endi captcha orqali emas, boshqa yo'l bilan olinadi

    // --- Profil elementlari ---
    const profileUserIdSpan = document.getElementById('profileUserId');
    const profileBalanceSpan = document.getElementById('profileBalance');
    const prizesWonList = document.getElementById('prizesWonList');
    const withdrawAmountInput = document.getElementById('withdrawAmount');
    const withdrawButton = document.getElementById('withdrawButton');
    const withdrawMessage = document.getElementById('withdrawMessage');

    // --- Admin Panel elementlari ---
    const adminUserIdInput = document.getElementById('adminUserIdInput');
    const adminSpinTypeSelect = document.getElementById('adminSpinTypeSelect');
    const adminChangeAmountInput = document.getElementById('adminChangeAmountInput');
    const adminUpdateSpinsButton = document.getElementById('adminUpdateSpinsButton');
    const adminMessage = document.getElementById('adminMessage');
    const adminUsersTableBody = document.querySelector('#adminUsersTable tbody');

    // !!! MUHIM: BU YERNI O'ZGARTIRDIK !!!
    // API_BASE_URL endi siz ko'rsatgan yangi manzilga ishora qiladi.
    const API_BASE_URL = 'https://c546.coresuz.ru/api.php'; 

    // Admin ID'si (Frontendda buni tekshirish xavfsiz emas, lekin navigatsiyani boshqarish uchun)
    const ADMIN_LOCAL_ID = '5780755613'; // <--- BU YERNI ADMIN ID'INGIZ BILAN ALMASHTIRING

    // --- Boshlang'ich funksiyalar va hodisalar ---

    // Sahifa bo'limlarini ko'rsatish funksiyasi
    function showSection(sectionToShow) {
        // Hamma bo'limlarni yashirish
        contestListSection.classList.add('hidden-section');
        contestDetailSection.classList.add('hidden-section');
        spinWheelSection.classList.add('hidden-section');
        profileSection.classList.add('hidden-section');
        adminPanelSection.classList.add('hidden-section');

        // Kerakli bo'limni ko'rsatish
        if (sectionToShow === 'list') {
            contestListSection.classList.remove('hidden-section');
            fetchContests();
        } else if (sectionToShow === 'detail') {
            contestDetailSection.classList.remove('hidden-section');
        } else if (sectionToShow === 'spin_wheel') {
            spinWheelSection.classList.remove('hidden-section');
            drawWheel(); // G'ildirakni chizish
            fetchUserBalance(); // Foydalanuvchi balansini va spinlarini yuklash
        } else if (sectionToShow === 'profile') {
            profileSection.classList.remove('hidden-section');
            fetchUserProfile(); // Foydalanuvchi profil ma'lumotlarini yuklash
        } else if (sectionToShow === 'admin') {
            adminPanelSection.classList.remove('hidden-section');
            fetchAdminUsersData(); // Admin panel uchun foydalanuvchi ma'lumotlarini yuklash
        }
    }

    // --- Captcha bilan bog'liq funksiyalar to'liq olib tashlandi ---


    // --- Konkurslar funksiyalari ---
    async function fetchContests() {
        loadingMessage.style.display = 'block';
        noContestsMessage.style.display = 'none';
        contestListContainer.innerHTML = ''; 

        try {
            const response = await fetch(`${API_BASE_URL}?action=get_all_contests`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            loadingMessage.style.display = 'none';

            if (data.status === 'success' && data.data.length > 0) {
                data.data.forEach(contest => {
                    const card = document.createElement('div');
                    card.classList.add('contest-card');
                    card.innerHTML = `
                        <h3>${contest.name}</h3>
                        <p><strong>NFT:</strong> <a href="${contest.nft_link}" target="_blank">Ko'rish</a></p>
                        <p><strong>Ishtirokchilar:</strong> ${contest.participants ? contest.participants.length : 0}</p>
                        <p><strong>Holati:</strong> <span class="status ${contest.status}">${contest.status === 'active' ? 'Faol' : 'Yakunlangan'}</span></p>
                        <p><strong>Yakunlanadi:</strong> ${formatContestEndTime(contest)}</p>
                    `;
                    card.addEventListener('click', () => showContestDetail(contest.id));
                    contestListContainer.appendChild(card);
                });
            } else {
                noContestsMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Konkurslarni yuklashda xatolik:', error);
            loadingMessage.textContent = 'Konkurslarni yuklashda xatolik yuz berdi. Iltimos, API URLini tekshiring.';
            loadingMessage.style.color = 'red';
            loadingMessage.style.display = 'block';
        }
    }

    async function showContestDetail(contestId) {
        showSection('detail');
        contestDetailContent.innerHTML = '<p class="info-message">Tafsilotlar yuklanmoqda...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}?action=get_contest_details&id=${contestId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.status === 'success') {
                const contest = data.data;
                let channelsHtml = contest.channels && contest.channels.length > 0
                    ? contest.channels.map(channel => `<a href="https://t.me/${channel}" target="_blank">@${channel}</a>`).join(', ')
                    : 'Mavjud emas';

                let winnerInfo = '';
                if (contest.status === 'finished' && contest.winner_id) {
                    winnerInfo = `<p><strong>G'olib ID:</strong> ${contest.winner_id}</p>`;
                }

                contestDetailContent.innerHTML = `
                    <h2>${contest.name}</h2>
                    <p><strong>Konkurs ID:</strong> #${contest.id}</p>
                    <p><strong>NFT ssilkasi:</strong> <a href="${contest.nft_link}" target="_blank">${contest.nft_link}</a></p>
                    <p><strong>Majburiy obuna kanallari:</strong> ${channelsHtml}</p>
                    <p><strong>Davomiyligi:</strong> ${contest.end_type === 'time' ? contest.duration_hours + ' soat' : (contest.members_count || 0) + ' ishtirokchi'}</p>
                    <p><strong>Yuborilgan kanal:</strong> <a href="https://t.me/${contest.post_channel}" target="_blank">@${contest.post_channel}</a></p>
                    <p><strong>Ma'lumot:</strong> ${contest.description}</p>
                    <p><strong>Ishtirokchilar:</strong> ${contest.participants ? contest.participants.length : 0}</p>
                    <p><strong>Holati:</strong> <span class="status ${contest.status}">${contest.status === 'active' ? 'Faol' : 'Yakunlangan'}</span></p>
                    ${winnerInfo}
                    <p><strong>Qolgan vaqt:</strong> ${formatContestEndTime(contest)}</p>
                `;
            } else {
                contestDetailContent.innerHTML = `<p class="info-message error">Xatolik: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Konkurs tafsilotlarini yuklashda xatolik:', error);
            contestDetailContent.innerHTML = '<p class="info-message error">Tafsilotlarni yuklashda kutilmagan xatolik yuz berdi.</p>';
        }
    }

    function formatContestEndTime(contest) {
        if (contest.status === 'finished') {
            return "Yakunlangan";
        }

        if (contest.end_type === 'members') {
            return `Ishtirokchilar soni: ${contest.participants ? contest.participants.length : 0} / ${contest.members_count}`;
        } else if (contest.end_type === 'time') {
            const now = Math.floor(Date.now() / 1000);
            const remainingTime = (contest.end_time || 0) - now; 

            if (remainingTime <= 0) {
                return "Yakunlangan";
            }

            const days = Math.floor(remainingTime / (60 * 60 * 24));
            const hours = Math.floor((remainingTime % (60 * 60 * 24)) / (60 * 60));
            const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
            const seconds = remainingTime % 60;

            let timeLeft = "";
            if (days > 0) timeLeft += `${days} kun `;
            if (hours > 0) timeLeft += `${hours} soat `;
            if (minutes > 0) timeLeft += `${minutes} daqiqa `;
            if (seconds > 0 && days === 0 && hours === 0 && minutes < 5) timeLeft += `${seconds} soniya `;
            else if (seconds > 0 && days === 0 && hours === 0 && minutes === 0) timeLeft += `${seconds} soniya `;
            
            return timeLeft.trim() + " qoldi";
        }
        return "Noma'lum";
    }

    // --- Omad g'ildiragi funksiyalari ---
    const WHEEL_COLORS = ['#FFC300', '#FF5733', '#C70039', '#900C3F', '#581845', '#4CAF50', '#2196F3', '#FF9800', '#8BC34A', '#E91E63', '#673AB7', '#00BCD4']; 

    async function drawWheel() {
        const primaryBg = getComputedStyle(document.documentElement).getPropertyValue('--primary-bg');
        const secondaryBg = getComputedStyle(document.documentElement).getPropertyValue('--secondary-bg');
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        const finishedStatusColor = getComputedStyle(document.documentElement).getPropertyValue('--finished-status');

        const response = await fetch(`${API_BASE_URL}?action=get_admin_settings`);
        const adminData = await response.json();
        if (adminData.status === 'success' && adminData.data && adminData.data.spin_game && adminData.data.spin_game.prizes) {
            prizesData = adminData.data.spin_game.prizes;
            dailyLimitSpan.textContent = adminData.data.spin_game.daily_free_spins || 2; 
        } else {
            console.error("Spin game settings could not be loaded. Using default prizes.");
            prizesData = [
                {"name": "0.1 TON", "amount": 0.1, "type": "ton", "chance": 0.5},
                {"name": "1 TON", "amount": 1, "type": "ton", "chance": 0.02},
                {"name": "NFT GIFT LOLPOP", "type": "nft_gift", "chance": 0.01},
                {"name": "Bot yasatish", "type": "bot_service", "chance": 0.05},
                {"name": "0.001 TON", "amount": 0.001, "type": "ton", "chance": 0.2},
                {"name": "0.02 TON", "amount": 0.02, "type": "ton", "chance": 0.09},
                {"name": "0.005 TON", "amount": 0.005, "type": "ton", "chance": 0.1},
                {"name": "Yana bir marta aylantirish imkoniyati", "type": "extra_spin", "amount": 1, "chance": 5},
                {"name": "Yana 2 marta aylantirish imkoniyati", "type": "extra_spin", "amount": 2, "chance": 1},
                {"name": "@ionuz kanalida bepul reklama", "type": "free_ad", "chance": 0.04},
                {"name": "100 so'm bonus", "amount": 100, "type": "bonus_sum", "chance": 10},
                {"name": "50 so'm bonus", "amount": 50, "type": "bonus_sum", "chance": 15},
                {"name": "Hech narsa", "type": "nothing", "chance": 50}
            ];
            dailyLimitSpan.textContent = 2;
        }

        const numSegments = prizesData.length;
        const segmentAngle = (2 * Math.PI) / numSegments;
        
        ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        prizesData.forEach((prize, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;

            ctx.beginPath();
            ctx.arc(wheelCanvas.width / 2, wheelCanvas.height / 2, wheelCanvas.width / 2 - 5, startAngle, endAngle);
            ctx.lineTo(wheelCanvas.width / 2, wheelCanvas.height / 2);
            ctx.closePath();
            ctx.fillStyle = WHEEL_COLORS[index % WHEEL_COLORS.length];
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.translate(wheelCanvas.width / 2, wheelCanvas.height / 2);
            ctx.rotate(startAngle + segmentAngle / 2 + Math.PI / numSegments); 
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = '12px Poppins';
            ctx.fillText(prize.name, wheelCanvas.width / 2 - 10, 0); 
            ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(wheelCanvas.width / 2, wheelCanvas.height / 2, 40, 0, 2 * Math.PI);
        ctx.fillStyle = secondaryBg; 
        ctx.fill();
        ctx.strokeStyle = accentColor; 
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = '20px Poppins';
        ctx.fillStyle = accentColor; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NFT', wheelCanvas.width / 2, wheelCanvas.height / 2 - 15);
        ctx.fillText('Spin', wheelCanvas.width / 2, wheelCanvas.height / 2 + 15);

        ctx.beginPath();
        ctx.fillStyle = finishedStatusColor; 
        ctx.moveTo(wheelCanvas.width / 2 - 10, 0);
        ctx.lineTo(wheelCanvas.width / 2 + 10, 0);
        ctx.lineTo(wheelCanvas.width / 2, 25);
        ctx.closePath();
        ctx.fill();
    }

    async function fetchUserBalance() {
        if (!currentUserId) {
            // Agar currentUserId mavjud bo'lmasa, uni test uchun yaratamiz
            // Real loyihada bu yerda Telegram login vidjetidan olingan ID ishlatiladi
            currentUserId = 'TEST_USER_' + Math.floor(Math.random() * 10000000); 
            checkAdminStatus(); // Admin panelini ko'rsatish uchun tekshiruv
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}?action=get_user_info&user_id=${currentUserId}`);
            const data = await response.json();
            if (data.status === 'success' && data.data) {
                currentBalanceSpan.textContent = (data.data.balance || 0).toFixed(3); 
                freeSpinsTodaySpan.textContent = data.data.free_spins_today || 0;
                extraSpinsSpan.textContent = data.data.extra_spins || 0;

                const canSpin = (data.data.free_spins_today > 0 || data.data.extra_spins > 0);
                spinButton.disabled = !canSpin;
                if (!canSpin) {
                    spinResult.textContent = 'Aylantirish uchun imkoniyatlaringiz qolmadi.';
                    spinResult.classList.add('error');
                } else {
                    spinResult.textContent = '';
                    spinResult.classList.remove('error');
                }
            } else {
                console.error('Foydalanuvchi balansini yuklashda xatolik:', data.message);
                currentBalanceSpan.textContent = "Yuklashda xato";
                spinButton.disabled = true;
                spinResult.textContent = 'Balans yuklashda xato.';
                spinResult.classList.add('error');
            }
        } catch (error) {
            console.error('Balansni yuklashda kutilmagan xato:', error);
            currentBalanceSpan.textContent = "Xato";
            spinButton.disabled = true;
            spinResult.textContent = 'Server bilan aloqada xato.';
            spinResult.classList.add('error');
        }
    }

    spinButton.addEventListener('click', async () => {
        if (spinning || !currentUserId) return;
        spinning = true;
        spinButton.disabled = true;
        spinResult.textContent = '';
        spinResult.classList.remove('error', 'success');

        try {
            const response = await fetch(`${API_BASE_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=spin_wheel&user_id=${currentUserId}`
            });
            const data = await response.json();

            if (data.status === 'success') {
                const prizeName = data.prize_won;
                const newBalance = data.new_balance;

                const segmentAngle = (2 * Math.PI) / prizesData.length;
                let prizeIndex = prizesData.findIndex(p => p.name === prizeName);
                if (prizeIndex === -1) prizeIndex = prizesData.length - 1; 

                const randomOffset = (Math.random() * (segmentAngle - 0.1)) - (segmentAngle / 2 - 0.05); 
                const targetRotation = 360 * 5 + (360 - (prizeIndex * (360 / prizesData.length))) - (360 / prizesData.length / 2) + (randomOffset * (180 / Math.PI));

                wheelCanvas.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
                wheelCanvas.style.transform = `rotate(${targetRotation}deg)`;

                setTimeout(() => {
                    spinning = false;
                    wheelCanvas.style.transition = 'none'; 
                    wheelDeg = targetRotation % 360; 
                    wheelCanvas.style.transform = `rotate(${wheelDeg}deg)`; 

                    spinResult.textContent = `Natija: ${data.message}`;
                    spinResult.classList.add('success');
                    currentBalanceSpan.textContent = (newBalance || 0).toFixed(3);
                    freeSpinsTodaySpan.textContent = data.free_spins_today;
                    extraSpinsSpan.textContent = data.extra_spins;
                    spinButton.disabled = !(data.free_spins_today > 0 || data.extra_spins > 0);
                    if (!spinButton.disabled) spinResult.classList.remove('success'); 
                }, 4000); 
            } else {
                spinning = false;
                spinButton.disabled = false;
                spinResult.textContent = `Xatolik: ${data.message}`;
                spinResult.classList.add('error');
                fetchUserBalance(); 
            }
        } catch (error) {
            console.error('Aylantirishda xatolik yuz berdi:', error);
            spinning = false;
            spinButton.disabled = false;
            spinResult.textContent = 'Server bilan aloqada xatolik yuz berdi.';
            spinResult.classList.add('error');
            fetchUserBalance();
        }
    });

    // --- Profil funksiyalari ---
    async function fetchUserProfile() {
        if (!currentUserId) {
            // Agar currentUserId mavjud bo'lmasa, uni test uchun yaratamiz
            currentUserId = 'TEST_USER_' + Math.floor(Math.random() * 10000000); 
        }

        try {
            const response = await fetch(`${API_BASE_URL}?action=get_user_info&user_id=${currentUserId}`);
            const data = await response.json();

            if (data.status === 'success' && data.data) {
                const user = data.data;
                profileUserIdSpan.textContent = currentUserId;
                profileBalanceSpan.textContent = (user.balance || 0).toFixed(3);

                prizesWonList.innerHTML = '';
                if (user.prizes_won && user.prizes_won.length > 0) {
                    user.prizes_won.forEach(prize => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span>${prize.prize}</span> <span>${prize.amount ? `(${prize.amount} TON)` : ''} - ${new Date(prize.date).toLocaleString()}</span>`;
                        prizesWonList.appendChild(li);
                    });
                } else {
                    prizesWonList.innerHTML = '<li class="info-message">Hozircha yutuqlar yo\'q.</li>';
                }
                withdrawButton.disabled = false;
            } else {
                profileUserIdSpan.textContent = 'Xato';
                profileBalanceSpan.textContent = 'Xato';
                prizesWonList.innerHTML = `<li class="info-message error">Profil ma'lumotlari yuklanmadi: ${data.message}</li>`;
                withdrawButton.disabled = true;
            }
        } catch (error) {
            console.error('Profil ma\'lumotlarini yuklashda xatolik:', error);
            profileUserIdSpan.textContent = 'Xato';
            profileBalanceSpan.textContent = 'Xato';
            prizesWonList.innerHTML = '<li class="info-message error">Server bilan aloqada xatolik yuz berdi.</li>';
            withdrawButton.disabled = true;
        }
    }

    withdrawButton.addEventListener('click', async () => {
        if (!currentUserId) return;

        const amount = parseFloat(withdrawAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            withdrawMessage.textContent = 'Iltimos, to\'g\'ri miqdorni kiriting.';
            withdrawMessage.classList.add('error');
            return;
        }
        
        withdrawButton.disabled = true;
        withdrawMessage.textContent = 'So\'rov yuborilmoqda...';
        withdrawMessage.classList.remove('error', 'success');

        try {
            const response = await fetch(`${API_BASE_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=withdraw_request&user_id=${currentUserId}&amount=${amount}`
            });
            const data = await response.json();

            if (data.status === 'success') {
                withdrawMessage.textContent = data.message;
                withdrawMessage.classList.add('success');
                profileBalanceSpan.textContent = (data.new_balance || 0).toFixed(3);
                withdrawAmountInput.value = ''; 
            } else {
                withdrawMessage.textContent = data.message;
                withdrawMessage.classList.add('error');
            }
        } catch (error) {
            console.error('Yechib olish so\'rovi yuborishda xato:', error);
            withdrawMessage.textContent = 'Server bilan aloqada xatolik yuz berdi.';
            withdrawMessage.classList.add('error');
        } finally {
            withdrawButton.disabled = false;
        }
    });

    // --- Admin Panel funksiyalari ---
    function checkAdminStatus() {
        // Bu yerda foydalanuvchi ID'si ADMIN_LOCAL_ID ga teng bo'lsa, admin panelini ko'rsatamiz
        if (currentUserId === ADMIN_LOCAL_ID) { 
            showAdminPanelNav.classList.remove('hidden');
        } else {
            showAdminPanelNav.classList.add('hidden');
        }
    }

    async function fetchAdminUsersData() {
        adminUsersTableBody.innerHTML = '<tr><td colspan="5" class="info-message">Yuklanmoqda...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}?action=admin_get_users_spins`);
            const data = await response.json();

            if (data.status === 'success' && data.data) {
                adminUsersTableBody.innerHTML = '';
                if (data.data.length === 0) {
                    adminUsersTableBody.innerHTML = '<tr><td colspan="5" class="info-message">Foydalanuvchilar topilmadi.</td></tr>';
                } else {
                    data.data.forEach(user => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${user.user_id}</td>
                            <td>${user.username || 'Noma\'lum'}</td>
                            <td>${(user.balance || 0).toFixed(3)}</td>
                            <td>${user.free_spins_today || 0}</td>
                            <td>${user.extra_spins || 0}</td>
                        `;
                        adminUsersTableBody.appendChild(row);
                    });
                }
            } else {
                adminUsersTableBody.innerHTML = `<tr><td colspan="5" class="info-message error">Xatolik: ${data.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Admin foydalanuvchi ma\'lumotlarini yuklashda xatolik:', error);
            adminUsersTableBody.innerHTML = '<tr><td colspan="5" class="info-message error">Server bilan aloqada xatolik.</td></tr>';
        }
    }

    adminUpdateSpinsButton.addEventListener('click', async () => {
        const targetUserId = adminUserIdInput.value;
        const spinType = adminSpinTypeSelect.value;
        const changeAmount = parseInt(adminChangeAmountInput.value);

        if (!targetUserId || isNaN(changeAmount)) {
            adminMessage.textContent = 'Iltimos, ID va miqdorni to\'g\'ri kiriting.';
            adminMessage.classList.add('error');
            return;
        }

        adminUpdateSpinsButton.disabled = true;
        adminMessage.textContent = 'Yangilanmoqda...';
        adminMessage.classList.remove('error', 'success');

        try {
            const response = await fetch(`${API_BASE_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=admin_update_user_spins&target_user_id=${targetUserId}&spin_type=${spinType}&change_amount=${changeAmount}`
            });
            const data = await response.json();

            if (data.status === 'success') {
                adminMessage.textContent = data.message;
                adminMessage.classList.add('success');
                adminUserIdInput.value = '';
                adminChangeAmountInput.value = '';
                fetchAdminUsersData(); 
            } else {
                adminMessage.textContent = data.message;
                adminMessage.classList.add('error');
            }
        } catch (error) {
            console.error('Admin urinishlarni yangilashda xatolik:', error);
            adminMessage.textContent = 'Server bilan aloqada xatolik yuz berdi.';
            adminMessage.classList.add('error');
        } finally {
            adminUpdateSpinsButton.disabled = false;
        }
    });


    // --- Global navigatsiya eventlari ---
    showAllContestsNav.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('list');
    });

    showSpinWheelNav.addEventListener('click', (e) => {
        e.preventDefault();
        // Captcha olib tashlangani uchun bu yerda ID tekshiruvi shart emas, chunki u avtomatik yaratiladi
        showSection('spin_wheel');
    });

    showProfileNav.addEventListener('click', (e) => {
        e.preventDefault();
        // Captcha olib tashlangani uchun bu yerda ID tekshiruvi shart emas, chunki u avtomatik yaratiladi
        showSection('profile');
    });

    showAdminPanelNav.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUserId !== ADMIN_LOCAL_ID) { 
            alert("Siz admin emassiz!");
            return;
        }
        showSection('admin');
    });

    // --- Sayt yuklanganda ishlaydigan kod ---
    // Captcha olib tashlangani uchun, sayt darhol yuklanadi
    // Foydalanuvchi ID'sini bu yerda avtomatik yaratamiz (TEST MAQSADIDA!)
    currentUserId = 'TEST_USER_' + Math.floor(Math.random() * 10000000); 
    checkAdminStatus(); // Admin panelini ko'rsatish
    showSection('list'); // Asosiy sahifani ko'rsatish
});
