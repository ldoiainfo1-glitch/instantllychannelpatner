// Vouchers — 3-Screen App Flow for Channel Partner
// Screen 1: My Vouchers List  (mirrors VoucherListScreen.tsx)
// Screen 2: Voucher Detail    (mirrors VoucherDetailScreen.tsx)
// Screen 3: Vouchers & Network Dashboard  (mirrors VoucherDashboard.tsx)
(function () {
    'use strict';

    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:5000/api'
        : 'https://api.instantllycards.com/api';

    const AUTH_TOKEN_KEY = 'authToken';

    // ─── App state ────────────────────────────────────────────────────────────
    const state = {
        currentScreen:   'list',
        selectedVoucher: null,
        dashboardLoaded: false,
        redeemCheckDone: false,
        availableVouchers: 0,
        isVoucherAdmin:    false,
        isMLMUser:         false,
        metrics:           {},
        creditStats:       {},
        discountSummary:   {},
        vouchers:          [],
        directBuyers:      [],
        distributionCredits: [],
        networkTree:       null,
        specialCredits:    null,
        networkSlots:      [],
        networkViewMode:   'list',
        buyQuantity:      5,
        buyTimer:         3600,
        buyTimerInterval: null,
        selectedBuyerId:   null,
        selectedBuyerName: '',
        selectedBuyerPhone: '',
    };

    // ─── Bootstrap ───────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
            window.location.href = 'voucher-login.html';
            return;
        }
        initEventListeners();
        loadVoucherList();
    });

    function initEventListeners() {
        document.getElementById('buyQtyMinus')?.addEventListener('click', () => changeBuyQty(-5));
        document.getElementById('buyQtyPlus')?.addEventListener('click',  () => changeBuyQty(5));
        document.getElementById('confirmBuyBtn')?.addEventListener('click', handleBuyNow);
        document.getElementById('confirmTransferCreditsBtn')?.addEventListener('click', handleTransferCreditsConfirm);
        document.getElementById('confirmTransferBtn')?.addEventListener('click', handleTransferVoucherConfirm);
    }

    // ════════════════════════════════════════════════════════════════════
    //  SCREEN NAVIGATION
    // ════════════════════════════════════════════════════════════════════

    function goToScreen(name, data) {
        ['list', 'detail', 'dashboard'].forEach(s => {
            const el = document.getElementById('screen-' + s);
            if (el) el.classList.toggle('active', s === name);
        });
        state.currentScreen = name;
        if (name === 'detail' && data) {
            state.selectedVoucher   = data;
            state.redeemCheckDone   = false;
            renderDetailScreen(data);
        }
        if (name === 'dashboard' && !state.dashboardLoaded) {
            loadDashboard();
        }
        window.scrollTo(0, 0);
    }

    window.goToScreen    = goToScreen;
    window.openDashboard = function () { goToScreen('dashboard'); };

    // ════════════════════════════════════════════════════════════════════
    //  SCREEN 1 — VOUCHER LIST
    // ════════════════════════════════════════════════════════════════════

    async function loadVoucherList() {
        const container = document.getElementById('voucherListContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="vc-loading">
                <div class="spinner-ring"></div>
                <div style="font-size:0.85rem;color:#6B7280;margin-top:10px;">Loading vouchers…</div>
            </div>`;
        try {
            const data = await apiFetch('/mlm/vouchers?limit=50');
            const vouchers = data?.vouchers || [];
            state.vouchers = vouchers;
            const countEl = document.getElementById('voucherCountText');
            if (countEl) countEl.textContent = vouchers.length > 0 ? `${vouchers.length} voucher${vouchers.length !== 1 ? 's' : ''} available` : 'No vouchers yet';
            renderVoucherListCards(vouchers, container);
        } catch (err) {
            console.error('Voucher list error:', err);
            container.innerHTML = `
                <div class="vc-empty">
                    <div class="vc-empty-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="vc-empty-title">Failed to load vouchers</div>
                    <div class="vc-empty-sub">Please check your connection and try again.</div>
                </div>`;
        }
    }

    function renderVoucherListCards(vouchers, container) {
        if (!vouchers || vouchers.length === 0) {
            container.innerHTML = `
                <div class="vc-empty">
                    <div class="vc-empty-icon"><i class="fas fa-ticket-alt"></i></div>
                    <div class="vc-empty-title">No Vouchers Yet</div>
                    <div class="vc-empty-sub">Purchase vouchers to start building your network and earning rewards.</div>
                </div>`;
            return;
        }
        container.innerHTML = vouchers.map(v => buildVoucherListCard(v)).join('');
        vouchers.forEach(v => {
            const card = document.getElementById('vc-' + v._id);
            if (card) card.addEventListener('click', () => goToScreen('detail', v));
        });
    }

    function buildVoucherListCard(v) {
        const status  = getVoucherStatus(v);
        const amount  = v.amount || v.MRP || 1200;
        const discPct = v.discountPercentage || 40;
        const phone   = v.companyPhone || '';
        const address = v.companyAddress || '';
        const company = v.companyName || 'Instantlly';
        let overlayHtml = '';
        if (status === 'Redeemed') overlayHtml = `<div class="vc-status-overlay" style="background:rgba(0,0,0,0.45);"><span class="vc-status-text" style="color:#10B981;transform:rotate(-15deg);">REDEEMED</span></div>`;
        else if (status === 'Expired') overlayHtml = `<div class="vc-status-overlay" style="background:rgba(0,0,0,0.4);"><span class="vc-status-text" style="color:#EF4444;transform:rotate(-15deg);">EXPIRED</span></div>`;
        const logoHtml = v.companyLogo
            ? `<div class="vc-logo-box"><img src="${escapeAttr(v.companyLogo)}" alt="${escapeAttr(company)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-building\\' style=\\'font-size:1.5rem;color:#93C5FD;\\'></i>'"></div>`
            : `<div class="vc-logo-box placeholder"><img src="images/logo.png" alt="Instantlly"></div>`;
        return `
        <div class="vc-card" id="vc-${escapeAttr(v._id)}">
            ${discPct > 0 ? `<div class="vc-disc-badge">-${discPct}%</div>` : ''}
            <div class="vc-header">
                ${logoHtml}
                <div class="vc-company">
                    <div class="vc-company-name">${escapeHtml(company)}</div>
                    ${phone ? `<div class="vc-info-row"><i class="fas fa-phone"></i><span>${escapeHtml(phone)}</span></div>` : ''}
                    ${address ? `<div class="vc-info-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(address)}</span></div>` : ''}
                </div>
                <div class="vc-amount-col">
                    <div class="vc-amt-symbol">₹</div>
                    <div class="vc-amt-value">${Number(amount).toLocaleString('en-IN')}</div>
                    ${discPct > 0 ? `<div class="vc-amt-disc">${discPct}% OFF</div>` : ''}
                    <div class="vc-amt-label">VOUCHER VALUE</div>
                </div>
            </div>
            ${v.description ? `<div class="vc-desc">${escapeHtml(v.description)}</div>` : ''}
            <div class="vc-validity"><i class="fas fa-star"></i><span>Valid till ${formatDate(v.expiryDate)}</span></div>
            ${overlayHtml}
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════
    //  SCREEN 2 — VOUCHER DETAIL
    // ════════════════════════════════════════════════════════════════════

    function renderDetailScreen(voucher) {
        const imgWrap = document.getElementById('detailImgWrap');
        if (imgWrap) {
            const useLocal = !voucher.voucherImage || voucher.voucherImage === 'local';
            const imgUrl   = useLocal ? 'images/1stVoucher.jpeg' : ((voucher.voucherImages && voucher.voucherImages[0]) || voucher.voucherImage || 'images/1stVoucher.jpeg');
            if (!useLocal && imgUrl !== 'images/1stVoucher.jpeg') {
                imgWrap.innerHTML = `<img src="${escapeAttr(imgUrl)}" alt="Voucher" onerror="this.src='images/1stVoucher.jpeg'">`;
            } else {
                const company = voucher.companyName || 'Instantlly';
                const amount  = voucher.amount || voucher.MRP || 1200;
                const discPct = voucher.discountPercentage || 40;
                const phone   = voucher.companyPhone || '';
                const address = voucher.companyAddress || '';
                imgWrap.innerHTML = `
                    <div class="detail-card-visual">
                        <div class="dcv-logo">
                            ${voucher.companyLogo ? `<img src="${escapeAttr(voucher.companyLogo)}" alt="${escapeAttr(company)}" onerror="this.src='images/logo.png'">` : `<img src="images/logo.png" alt="Instantlly">`}
                        </div>
                        <div class="dcv-name">${escapeHtml(company)}</div>
                        ${phone ? `<div class="dcv-phone"><i class="fas fa-phone" style="font-size:0.75rem;margin-right:5px;"></i>${escapeHtml(phone)}</div>` : ''}
                        ${address ? `<div class="dcv-addr"><i class="fas fa-map-marker-alt" style="font-size:0.75rem;margin-right:5px;"></i>${escapeHtml(address)}</div>` : ''}
                        ${discPct > 0 ? `<div class="dcv-disc-badge">${discPct}% OFF</div>` : ''}
                        <div class="dcv-amount">₹${Number(amount).toLocaleString('en-IN')}</div>
                        ${discPct > 0 ? `<div class="dcv-disc-pct">${discPct}% Discount Applied</div>` : ''}
                        <div class="dcv-value-label">VOUCHER VALUE</div>
                        <div class="dcv-validity"><i class="fas fa-star"></i><span>Valid till ${formatDate(voucher.expiryDate)}</span></div>
                    </div>`;
            }
        }
        checkAndRenderRedeemButton(voucher);
    }

    async function checkAndRenderRedeemButton(voucher) {
        const section = document.getElementById('detailRedeemSection');
        if (!section) return;
        section.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;background:#F9FAFB;border-radius:12px;padding:16px;opacity:0.6;">
                <div class="spinner-ring" style="width:24px;height:24px;border-width:2px;"></div>
                <span style="font-size:0.85rem;color:#6B7280;">Checking availability…</span>
            </div>`;
        try {
            const data = await apiFetch('/mlm/vouchers');
            const available = data?.availableVouchers ?? (data?.vouchers?.filter(v => v.redeemedStatus !== 'redeemed').length ?? 0);
            state.availableVouchers = available;
            state.redeemCheckDone   = true;
            if (available > 0) {
                section.innerHTML = `
                    <button class="btn-redeem-now" onclick="handleRedeemNow()">
                        <i class="fas fa-bullhorn"></i>
                        <span>Redeem Now - Publish Ad</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>`;
            } else {
                section.innerHTML = `
                    <div class="btn-no-voucher">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>You have no available vouchers to redeem right now. Purchase vouchers to unlock the Redeem Now button.</span>
                    </div>`;
            }
        } catch {
            section.innerHTML = `
                <div class="btn-no-voucher">
                    <i class="fas fa-wifi"></i>
                    <span>Could not check availability. Please try again.</span>
                </div>`;
        }
    }

    window.handleRedeemNow = function () {
        if (state.availableVouchers > 0) window.location.href = 'promotions.html';
        else showToast('No available vouchers. Purchase vouchers first.', 'error');
    };

    // ════════════════════════════════════════════════════════════════════
    //  SCREEN 3 — DASHBOARD
    // ════════════════════════════════════════════════════════════════════

    async function loadDashboard() {
        const scrollContent = document.getElementById('dashScrollContent');
        if (!scrollContent) return;
        scrollContent.innerHTML = `
            <div class="loading-overlay">
                <div class="spinner-ring" style="margin:0 auto 12px;"></div>
                <div style="font-size:0.85rem;color:#6B7280;">Loading dashboard…</div>
            </div>`;

        try {
            const [overviewRes, creditRes, discountRes, voucherRes, userProfileRes, distributionRes, treeRes, buyerRes] =
                await Promise.allSettled([
                    apiFetch('/mlm/overview'),
                    apiFetch('/mlm/credits/dashboard'),
                    apiFetch('/mlm/discount/summary'),
                    apiFetch('/mlm/vouchers?limit=50'),
                    apiFetch('/users/profile'),
                    apiFetch('/mlm/distribution-credits'),
                    apiFetch('/mlm/network/tree?depth=3&perParentLimit=5'),
                    apiFetch('/mlm/network/direct-buyers?limit=10'),
                ]);

            const overview        = getVal(overviewRes);
            const creditDashboard = getVal(creditRes);
            const discount        = getVal(discountRes);
            const voucherData     = getVal(voucherRes);
            const userProfile     = getVal(userProfileRes);
            const distribution    = getVal(distributionRes);
            const treeData        = getVal(treeRes);
            const buyerData       = getVal(buyerRes);

            const isAdmin = overview?.user?.isVoucherAdmin === true;
            state.isVoucherAdmin = isAdmin;
            state.isMLMUser      = !!(userProfile?.user?.introducerId);

            if (isAdmin) {
                try {
                    const [scRes, nsRes] = await Promise.allSettled([apiFetch('/mlm/special-credits/dashboard'), apiFetch('/mlm/special-credits/network')]);
                    state.specialCredits = getVal(scRes)?.dashboard || null;
                    state.networkSlots   = getVal(nsRes)?.networkUsers || [];
                } catch (_) { /* ignore */ }
            }

            if (isAdmin && state.specialCredits) {
                const sc = state.specialCredits;
                state.metrics = { availableCredits: sc.specialCredits?.balance||0, totalVouchersTransferred: sc.specialCredits?.totalSent||0, totalNetworkUsers: sc.slots?.used||0, virtualCommission: sc.specialCredits?.totalSent||0, currentDiscountPercent: 0, vouchersFigure: sc.vouchersFigure||0 };
            } else if (overview?.metrics) { state.metrics = overview.metrics; }

            if (creditDashboard) {
                state.creditStats = { totalCreditReceived: creditDashboard.totalCreditsReceived||0, totalCreditTransferred: creditDashboard.totalCreditsTransferred||0, totalCreditBalance: creditDashboard.creditBalance||0, recentTransfers: creditDashboard.recentTransfers||[], timers: creditDashboard.timers||[] };
            }
            if (discount?.summary) state.discountSummary = discount.summary;
            state.vouchers            = voucherData?.vouchers || [];
            state.distributionCredits = distribution?.credits || [];
            state.directBuyers        = buyerData?.buyers || [];
            if (treeData?.tree) state.networkTree = mapTree(treeData.tree);
            if (isAdmin && state.networkSlots.length > 0) {
                state.networkTree = { id: overview?.user?.id||'admin', name: overview?.user?.name||'Admin', phone: overview?.user?.phone||'', level: 0,
                    directChildren: state.networkSlots.map(slot => ({ id: slot.id||`placeholder-${slot.slotNumber}`, name: slot.name||`User ${slot.slotNumber}`, phone: slot.phone||'Not assigned', level: slot.recipientLevel||slot.level||slot.slotNumber||1, directChildren: [], totalNetworkCount: 0, directCount: 0, joinedDate: slot.sentAt||new Date().toISOString(), isActive: !slot.isPlaceholder, isPlaceholder: slot.isPlaceholder!==false, creditsReceived: slot.credits||0 })),
                    totalNetworkCount: state.networkSlots.length, directCount: state.networkSlots.length, joinedDate: overview?.user?.createdAt||new Date().toISOString() };
            }

            scrollContent.innerHTML = buildDashboardHTML();
            wireDashboardEvents();
            applyAdminUI(); renderNetworkOverview(); renderVoucherStatsCard(); renderDistributionCreditsTable();
            renderCreditStats(); renderDiscountSummary(); renderDirectBuyers(); renderVouchersList(); renderNetworkTree();
            state.dashboardLoaded = true;

        } catch (err) {
            console.error('Dashboard load error:', err);
            scrollContent.innerHTML = `
                <div class="loading-overlay">
                    <div style="font-size:2rem;color:#EF4444;margin-bottom:12px;"><i class="fas fa-exclamation-circle"></i></div>
                    <div style="font-size:0.9rem;font-weight:600;color:#374151;">Failed to load dashboard</div>
                    <button onclick="loadDashboard()" style="margin-top:14px;background:#4F46E5;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:0.85rem;font-weight:600;cursor:pointer;">Retry</button>
                </div>`;
        }
    }
    window.loadDashboard = loadDashboard;

    function wireDashboardEvents() {
        document.getElementById('netViewList')?.addEventListener('click', () => setNetworkView('list'));
        document.getElementById('netViewTree')?.addEventListener('click', () => setNetworkView('tree'));
        document.getElementById('thToggleBtn')?.addEventListener('click', toggleTransferHistory);
    }

    function buildDashboardHTML() {
        return `
        <div class="dash-card" id="networkOverviewCard">
            <div class="dash-card-header"><span class="dash-card-title"><i class="fas fa-chart-bar me-2" style="color:#3B82F6;"></i>Network Overview</span><button class="btn-refresh" onclick="loadDashboard()"><i class="fas fa-sync-alt me-1"></i>Refresh</button></div>
            <div class="dash-card-body">
                <div class="ov-grid">
                    <div class="ov-metric"><div class="ov-icon green"><i class="fas fa-coins"></i></div><div><div class="ov-label">Available Credits</div><div class="ov-value" id="ovAvailableCredits">—</div></div></div>
                    <div class="ov-metric"><div class="ov-icon blue"><i class="fas fa-paper-plane"></i></div><div><div class="ov-label">Credits Distributed</div><div class="ov-value" id="ovCreditsDistributed">—</div></div></div>
                    <div class="ov-metric"><div class="ov-icon purple"><i class="fas fa-users"></i></div><div><div class="ov-label">Network Users</div><div class="ov-value" id="ovNetworkUsers">—</div></div></div>
                    <div class="ov-metric" id="virtualSavingsStat"><div class="ov-icon amber"><i class="fas fa-gift"></i></div><div><div class="ov-label">Virtual Savings</div><div class="ov-value" id="ovVirtualSavings">—</div></div></div>
                </div>
                <div id="ovAvailableVouchersRow" style="display:none;margin-top:10px;">
                    <div class="ov-metric"><div class="ov-icon green"><i class="fas fa-ticket-alt"></i></div><div><div class="ov-label">Available Vouchers</div><div class="ov-value" id="ovAvailableVouchers">—</div></div></div>
                </div>
            </div>
        </div>

        <div class="vs-card" id="voucherStatsCard" onclick="openBuyVouchersPanel()">
            <div class="vs-header">
                <div><div style="font-size:0.95rem;font-weight:700;color:#1F2937;">My Vouchers</div><div style="font-size:0.72rem;color:#6B7280;margin-top:2px;">Tap to purchase more</div></div>
                <div class="vs-icon"><i class="fas fa-ticket-alt"></i></div>
            </div>
            <div class="vs-stats">
                <div class="vs-stat-item"><div class="vs-stat-icon" style="background:rgba(59,130,246,0.1);"><i class="fas fa-layer-group" style="font-size:0.85rem;color:#3B82F6;"></i></div><div class="vs-stat-value" id="vsAvailable">—</div><div class="vs-stat-label">Available</div></div>
                <div class="vs-stat-item"><div class="vs-stat-icon" style="background:rgba(139,92,246,0.1);"><i class="fas fa-archive" style="font-size:0.85rem;color:#8B5CF6;"></i></div><div class="vs-stat-value" id="vsTotal">—</div><div class="vs-stat-label">Total</div></div>
                <div class="vs-stat-item"><div class="vs-stat-icon" style="background:rgba(16,185,129,0.1);"><i class="fas fa-check-circle" style="font-size:0.85rem;color:#10B981;"></i></div><div class="vs-stat-value" id="vsRedeemed">—</div><div class="vs-stat-label">Redeemed</div></div>
            </div>
            <button class="vs-buy-btn"><i class="fas fa-plus-circle"></i> Buy Vouchers <i class="fas fa-arrow-right"></i></button>
        </div>

        <div class="dash-card" id="distributionCreditsCard" style="display:none;">
            <div class="dash-card-header"><span class="dash-card-title"><i class="fas fa-sitemap me-2" style="color:#8B5CF6;"></i>Distribution Credits</span></div>
            <div class="dash-card-body" style="padding:0 0 14px;"><div class="dist-table-wrap"><table class="dist-table"><thead><tr><th>Level</th><th>Recipient</th><th>Credits</th><th>Vouchers</th><th>Status</th><th>Action</th></tr></thead><tbody id="distributionTableBody"></tbody></table></div></div>
        </div>

        <div class="dash-card">
            <div class="dash-card-header"><span class="dash-card-title"><i class="fas fa-wallet me-2" style="color:#10B981;"></i>Credit Statistics</span></div>
            <div class="dash-card-body">
                <div class="cs-item"><div class="cs-icon" style="background:rgba(16,185,129,0.1);"><i class="fas fa-coins" style="color:#10B981;"></i></div><div><div class="cs-label">Total Balance</div><div class="cs-value" style="color:#10B981;" id="creditBalance">—</div></div></div>
                <div class="cs-item"><div class="cs-icon" style="background:rgba(59,130,246,0.1);"><i class="fas fa-arrow-down" style="color:#3B82F6;"></i></div><div><div class="cs-label">Total Received</div><div class="cs-value" style="color:#3B82F6;" id="csReceived">—</div></div></div>
                <div class="cs-item"><div class="cs-icon" style="background:rgba(139,92,246,0.1);"><i class="fas fa-arrow-up" style="color:#8B5CF6;"></i></div><div><div class="cs-label">Total Transferred</div><div class="cs-value" style="color:#8B5CF6;" id="csTransferred">—</div></div></div>
                <button class="th-toggle" id="thToggleBtn"><span><i class="fas fa-history me-2" style="color:#4F46E5;"></i>Recent Transfers (<span id="thCount">0</span>)</span><i class="fas fa-chevron-down chevron"></i></button>
                <div class="th-list" id="transferHistoryList"></div>
                <div id="timerSection" style="display:none;"><div class="timer-section" id="timerRows"></div></div>
            </div>
        </div>

        <div class="dash-card" id="discountCard">
            <div class="dash-card-header"><span class="dash-card-title"><i class="fas fa-percentage me-2" style="color:#F59E0B;"></i>Discount Summary</span><div class="level-badge"><i class="fas fa-star" style="color:#F59E0B;font-size:0.7rem;"></i><span id="discLevel">Level 1</span></div></div>
            <div class="dash-card-body">
                <div class="disc-metrics">
                    <div class="disc-metric"><div class="disc-metric-label">Discount</div><div class="disc-metric-value" id="discPercent">—</div></div>
                    <div class="disc-metric"><div class="disc-metric-label">Payable</div><div class="disc-metric-value" id="discPayable">—</div></div>
                    <div class="disc-metric"><div class="disc-metric-label">Virtual</div><div class="disc-metric-value" id="discVirtual">—</div></div>
                </div>
                <div id="discProgressBox" style="display:none;" class="progress-box"><div style="font-size:0.78rem;font-weight:700;color:#059669;margin-bottom:3px;" id="discProgressText"></div><div style="font-size:0.72rem;color:#047857;" id="discProgressSub"></div></div>
                <div class="disclaimer-box"><i class="fas fa-info-circle"></i><span id="discDisclaimer">This amount represents savings unlocked via discounts and is not withdrawable.</span></div>
            </div>
        </div>

        <div class="dash-card">
            <div class="dash-card-header">
                <span class="dash-card-title"><i class="fas fa-user-friends me-2" style="color:#3B82F6;"></i>Direct Buyers</span>
                <button id="adminTransferBtn" onclick="openAdminVoucherTransferModal('','')" style="display:none;background:#8B5CF6;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;"><i class="fas fa-paper-plane me-1"></i>Transfer</button>
            </div>
            <div class="dash-card-body" id="directBuyersList"><div class="loading-overlay"><div class="spinner-ring" style="margin:auto;"></div></div></div>
        </div>

        <div class="dash-card" id="vouchersListCard">
            <div class="dash-vtabs">
                <button class="dash-vtab active" onclick="switchDashTab('all',this)">All <span class="dash-vtab-badge" id="allBadge">0</span></button>
                <button class="dash-vtab" onclick="switchDashTab('purchased',this)">Purchased <span class="dash-vtab-badge" id="purchasedBadge">0</span></button>
                <button class="dash-vtab" onclick="switchDashTab('received',this)">Received <span class="dash-vtab-badge" id="receivedBadge">0</span></button>
            </div>
            <div class="dash-vtab-pane active" id="pane-all"></div>
            <div class="dash-vtab-pane" id="pane-purchased"></div>
            <div class="dash-vtab-pane" id="pane-received"></div>
        </div>

        <div class="dash-card" id="networkTreeCard" style="display:none;">
            <div class="dash-card-header"><span class="dash-card-title"><i class="fas fa-project-diagram me-2" style="color:#8B5CF6;"></i>My Network</span></div>
            <div class="dash-card-body">
                <div class="net-toggle-row">
                    <button class="net-toggle-btn active" id="netViewList"><i class="fas fa-list me-1"></i>List View</button>
                    <button class="net-toggle-btn" id="netViewTree"><i class="fas fa-sitemap me-1"></i>Tree View</button>
                </div>
                <div id="networkTreeContainer"></div>
            </div>
        </div>`;
    }

    // ─── Tree mapper ──────────────────────────────────────────────────────────
    function mapTree(node) {
        const children = (node.directChildren || []).map(mapTree);
        const total    = children.reduce((s, c) => s + 1 + c.totalNetworkCount, 0);
        return { id: node.id, name: node.name, phone: node.phone, level: node.level||0, directChildren: children, totalNetworkCount: total, directCount: node.directCount||children.length, structuralCreditPool: node.structuralCreditPool, joinedDate: node.joinedDate, isActive: true, isPlaceholder: node.isPlaceholder||false, creditsReceived: node.creditsReceived||0 };
    }

    // ─── Admin UI toggle ──────────────────────────────────────────────────────
    function applyAdminUI() {
        const isAdmin = state.isVoucherAdmin;
        const sub = document.getElementById('dashSubtitle');
        if (sub) sub.textContent = isAdmin ? 'Sales Target at Special Discount' : '5× Referral Credit Distribution';
        ['voucherStatsCard','discountCard','vouchersListCard'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display=isAdmin?'none':'block'; });
        const vs = document.getElementById('virtualSavingsStat'); if(vs) vs.style.display = isAdmin?'none':'';
        const at = document.getElementById('adminTransferBtn');   if(at) at.style.display = isAdmin?'flex':'none';
    }

    // ─── Render helpers ───────────────────────────────────────────────────────
    function renderNetworkOverview() {
        const m = state.metrics;
        set('ovAvailableCredits',  fmtNum(m.availableCredits));
        set('ovCreditsDistributed', fmtNum(m.totalVouchersTransferred));
        set('ovNetworkUsers',      fmtNum(m.totalNetworkUsers));
        set('ovVirtualSavings',    '₹' + fmtNum(m.virtualCommission));
        const avRow = document.getElementById('ovAvailableVouchersRow');
        if (avRow) { avRow.style.display=(m.vouchersFigure&&m.vouchersFigure>0)?'':'none'; if(m.vouchersFigure) set('ovAvailableVouchers',fmtNum(m.vouchersFigure)); }
    }

    function renderVoucherStatsCard() {
        if (state.isVoucherAdmin) return;
        const v = state.vouchers;
        set('vsAvailable', v.filter(x=>!x.redeemedStatus||x.redeemedStatus==='unredeemed').length);
        set('vsTotal',     v.length);
        set('vsRedeemed',  v.filter(x=>x.redeemedStatus==='redeemed').length);
        set('allBadge',       v.length);
        set('purchasedBadge', v.filter(x=>x.source==='purchase').length);
        set('receivedBadge',  v.filter(x=>x.source==='transfer'||x.source==='admin').length);
    }

    function renderDistributionCreditsTable() {
        const card = document.getElementById('distributionCreditsCard'); if (!card) return;
        const credits = state.distributionCredits;
        if (!state.isMLMUser || credits.length===0) { card.style.display='none'; return; }
        card.style.display='block';
        const tbody = document.getElementById('distributionTableBody'); if (!tbody) return;
        tbody.innerHTML = credits.map(c => {
            const vCount=c.vouchersShared||0; const isLocked=c.isLocked!==false;
            const color=isLocked?'#EF4444':'#10B981'; const lockIcon=isLocked?'fa-lock':'fa-lock-open';
            return `<tr>
                <td class="dist-td">${c.level}</td>
                <td class="dist-td"><div>${escapeHtml(c.recipientName)}</div><div style="font-size:0.7rem;color:#9CA3AF;">${escapeHtml(c.recipientPhone)}</div></td>
                <td class="dist-td">₹${fmtCreditsAmt(c.creditsToTransfer)}</td>
                <td class="dist-td" style="font-weight:700;color:${vCount>=5?'#10B981':'#F59E0B'};">${vCount}/5</td>
                <td class="dist-td"><span style="font-size:0.75rem;font-weight:700;color:${color};background:${color}15;padding:3px 8px;border-radius:6px;"><i class="fas ${lockIcon}" style="font-size:0.7rem;"></i> ${isLocked?'Locked':'Ready'}</span></td>
                <td class="dist-td"><button class="dist-transfer-btn${isLocked?' locked':''}" ${isLocked?'disabled':''} onclick="triggerDistributionTransfer('${escapeAttr(c.recipientId)}',${c.creditsToTransfer})">${isLocked?'Locked':'Transfer'}</button></td>
            </tr>`;
        }).join('');
    }

    window.triggerDistributionTransfer = async function(id, amount) {
        if (!confirm('Transfer credits to this person?')) return;
        try { const res=await apiFetch('/mlm/credits/transfer','POST',{receiverId:id,amount:1,note:'Distribution credit transfer'}); if(res?.success){showToast('Credits transferred!','success');loadDashboard();}else showToast(res?.message||'Transfer failed','error'); }
        catch { showToast('Transfer failed. Please try again.','error'); }
    };

    function renderCreditStats() {
        const d = state.creditStats;
        set('creditBalance', fmtNum(d.totalCreditBalance||0)+' credits');
        set('csReceived',    fmtNum(d.totalCreditReceived||0)+' credits');
        set('csTransferred', fmtNum(d.totalCreditTransferred||0)+' credits');
        const transfers = d.recentTransfers||[];
        set('thCount', transfers.length);
        const list = document.getElementById('transferHistoryList');
        if (list) {
            list.innerHTML = transfers.length===0 ? '<div style="font-size:0.85rem;color:#9CA3AF;padding:0.5rem 0;">No transfers yet</div>'
                : transfers.map(t => {
                    const isOk=t.status==='completed'||t.status==='approved'; const isPend=t.status==='pending'||t.status==='waiting_approval';
                    const color=isOk?'#10B981':isPend?'#F59E0B':'#EF4444'; const icon=isOk?'fa-check-circle':isPend?'fa-clock':'fa-times-circle';
                    const slbl=(t.status||'pending').charAt(0).toUpperCase()+(t.status||'pending').slice(1);
                    return `<div class="th-item">
                        <div class="th-left"><div style="width:30px;height:30px;border-radius:50%;background:${color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas ${icon}" style="color:${color};font-size:0.85rem;"></i></div>
                        <div><div class="th-name">${escapeHtml(t.recipientName||'Unknown')}</div><div class="th-date">${formatDate(t.date)}</div></div></div>
                        <div style="text-align:right;"><div class="th-amount">₹${fmtNum(t.amount||0)}</div><span class="th-badge" style="background:${color}20;color:${color};">${escapeHtml(slbl)}</span></div>
                    </div>`;
                }).join('');
        }
        const timers=d.timers||[]; const timerSect=document.getElementById('timerSection'); const timerRows=document.getElementById('timerRows');
        if (timers.length>0&&timerSect&&timerRows) {
            timerSect.style.display='block';
            timerRows.innerHTML=timers.map(tm=>{
                let label='Transfer',timeVal='--';
                if(tm.paymentStatus==='pending'){label='Payment Pending';timeVal=formatCountdown(tm.expiresAt);}
                else if(tm.paymentStatus==='waiting_approval'){label='Admin Review';timeVal='Pending';}
                else{timeVal=formatCountdown(tm.transferExpiresAt);}
                return `<div class="timer-row"><div style="display:flex;align-items:center;gap:6px;"><i class="fas fa-hourglass-half" style="color:#4F46E5;"></i>${escapeHtml(label)}</div><div>${timeVal}</div></div>`;
            }).join('');
        }
    }

    function renderDiscountSummary() {
        if (state.isVoucherAdmin) return;
        const s=state.discountSummary;
        set('discLevel',      'Level '+(s.currentLevel||1));
        set('discPercent',    (s.discountPercent||40)+'%');
        set('discPayable',    '₹'+fmtNum(s.payableAmount||3600));
        set('discVirtual',    '₹'+fmtNum(s.virtualCommission||0));
        set('discDisclaimer', s.disclaimer||'This amount represents savings unlocked via discounts and is not withdrawable.');
        if (s.nextLevelTarget) {
            const pb=document.getElementById('discProgressBox'); if(pb) pb.style.display='block';
            set('discProgressText',`Level ${s.nextLevelTarget.level} · ${s.nextLevelTarget.targetDiscountPercent}% discount`);
            set('discProgressSub',`${s.nextLevelTarget.remainingDownline} more members needed`);
        }
    }

    function renderDirectBuyers() {
        const container=document.getElementById('directBuyersList'); if(!container) return;
        const buyers=state.directBuyers;
        if (!buyers.length) {
            container.innerHTML=`<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-user-friends"></i></div><div class="empty-state-title">No direct buyers yet</div><div class="empty-state-sub">People who join through your link will appear here</div></div>`;
            return;
        }
        container.innerHTML=buyers.map(b=>`
            <div class="buyer-entry">
                <div class="buyer-row">
                    <div><div class="buyer-name">${escapeHtml(b.name||'Unknown')}</div><div class="buyer-meta">${escapeHtml(b.phone||'')}${b.teamSize!==undefined?' · Team: '+b.teamSize:''}</div></div>
                    ${b.phone?`<a class="btn-call" href="tel:${escapeAttr(b.phone)}"><i class="fas fa-phone" style="font-size:0.8rem;"></i> Call</a>`:''}
                </div>
                ${!state.isVoucherAdmin?`
                <div class="buyer-btn-row">
                    <button class="btn-tc" onclick="openTransferCreditsModal('${escapeAttr(b.id)}','${escapeAttr(b.name||'')}','${escapeAttr(b.phone||'')}')"><i class="fas fa-coins"></i> Transfer Credits</button>
                    <button class="btn-tv" onclick="openTransferVoucherToBuyer('${escapeAttr(b.id)}','${escapeAttr(b.name||'')}','${escapeAttr(b.phone||'')}')"><i class="fas fa-ticket-alt"></i> Transfer Vouchers</button>
                </div>`:''}
            </div>`).join('');
    }

    function renderVouchersList() {
        if (state.isVoucherAdmin) return;
        const all=state.vouchers; const purchased=all.filter(v=>v.source==='purchase'); const received=all.filter(v=>v.source==='transfer'||v.source==='admin');
        set('allBadge',all.length); set('purchasedBadge',purchased.length); set('receivedBadge',received.length);
        renderVoucherTab('all',all,'pane-all'); renderVoucherTab('purchased',purchased,'pane-purchased'); renderVoucherTab('received',received,'pane-received');
    }

    function renderVoucherTab(type, vouchers, paneId) {
        const container=document.getElementById(paneId); if(!container) return;
        if (!vouchers||vouchers.length===0) {
            const labels={all:'All',purchased:'Purchased',received:'Received'};
            container.innerHTML=`<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-ticket-alt"></i></div><div class="empty-state-title">No ${labels[type]||type} vouchers</div><div class="empty-state-sub">Your ${type} vouchers will appear here</div></div>`;
            return;
        }
        container.innerHTML=vouchers.map(v=>buildDashVoucherTicket(v,type)).join('');
        vouchers.forEach(v=>{
            document.getElementById(`dv-transfer-${v._id}`)?.addEventListener('click',()=>openVoucherTransferModal(v));
            document.getElementById(`dv-redeem-${v._id}`)?.addEventListener('click',()=>handleRedeem(v._id));
        });
    }

    function buildDashVoucherTicket(v) {
        const status=getVoucherStatus(v); const sPill=status==='Active'?'s-active':status==='Redeemed'?'s-redeemed':'s-expired';
        const amount=v.amount||v.MRP||1200; const discPct=v.discountPercentage||0;
        const canTransfer=v.redeemedStatus==='unredeemed'&&new Date(v.expiryDate)>new Date()&&!v.isSpecialCreditsVoucher;
        const canRedeem=v.redeemedStatus==='unredeemed'&&new Date(v.expiryDate)>new Date()&&!v.isSpecialCreditsVoucher;
        return `
        <div class="dvt-card">
            <div class="dvt-top">
                <div class="dvt-logo"><i class="fas fa-bolt"></i></div>
                <div class="dvt-info"><div class="dvt-biz-name">${escapeHtml(v.companyName||'Instantlly')}</div><div class="dvt-num">#${escapeHtml(v.voucherNumber)}</div></div>
                <div class="dvt-amount-wrap"><div class="dvt-amount-val">₹${Number(amount).toLocaleString('en-IN')}</div><div class="dvt-amount-lbl">value</div></div>
                ${discPct>0?`<span class="dvt-disc-badge">-${discPct}%</span>`:''}
            </div>
            <div class="dvt-bottom">
                <div><div class="dvt-validity"><i class="fas fa-star" style="color:#F59E0B;font-size:0.65rem;margin-right:3px;"></i>Valid till ${formatDate(v.expiryDate)}</div><span class="src-tag src-${v.source||'purchase'}" style="margin-top:3px;display:inline-block;">${v.source||'purchase'}</span></div>
                <div style="display:flex;align-items:center;gap:6px;"><span class="dvt-status-pill ${sPill}">${status}</span>
                    <div class="dvt-actions">
                        ${canTransfer?`<button class="btn-dvt-transfer" id="dv-transfer-${v._id}"><i class="fas fa-paper-plane" style="font-size:0.7rem;"></i></button>`:''}
                        <button class="btn-dvt-redeem" id="dv-redeem-${v._id}" ${canRedeem?'':'disabled'}>${status==='Redeemed'?'Redeemed':status==='Expired'?'Expired':'Redeem'}</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function renderNetworkTree() {
        const card=document.getElementById('networkTreeCard'); if(!card) return;
        if (!state.networkTree) { card.style.display='none'; return; }
        card.style.display='block';
        renderNetworkView(state.networkViewMode);
    }

    function setNetworkView(mode) {
        state.networkViewMode=mode;
        document.getElementById('netViewList')?.classList.toggle('active',mode==='list');
        document.getElementById('netViewTree')?.classList.toggle('active',mode==='tree');
        renderNetworkView(mode);
    }

    // ─── Network helpers ──────────────────────────────────────────────────────
    function getInitials(name) {
        if (!name) return '?';
        return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    function avatarColor(level) { return ['av-green','av-blue','av-purple','av-amber','av-rose','av-cyan','av-indigo'][(level||0)%7]; }
    const AVATAR_HEX = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#F43F5E','#06B6D4','#6366F1'];
    function avatarColorHex(level) { return AVATAR_HEX[(level||0)%7]; }

    // ─── Shared user card (matches app UserCardNetwork exactly) ───────────────
    function buildUserCard(user, isDirect) {
        const initials = getInitials(user.name) || '?';
        const credits  = fmtNum(user.creditsReceived || 0);
        const pool     = '₹' + fmtNum(Math.round(user.structuralCreditPool || 0));
        const hex      = avatarColorHex(user.level);
        const transferBtn = user.isPlaceholder
            ? `<button class="tree-arrow-btn slot" onclick="openSpecialTransferModal(${user.level},'${escapeAttr(user.name)}')"><i class="fas fa-plus" style="font-size:0.7rem;"></i></button>`
            : state.isVoucherAdmin
                ? `<button class="tree-arrow-btn" onclick="openAdminVoucherTransferModal('${escapeAttr(user.phone||'')}','${escapeAttr(user.name)}')"><i class="fas fa-arrow-right"></i></button>`
                : isDirect
                    ? `<button class="tree-arrow-btn" onclick="openTransferCreditsModal('${escapeAttr(user.id)}','${escapeAttr(user.name)}','${escapeAttr(user.phone||'')}')"><i class="fas fa-arrow-right"></i></button>`
                    : '';
        const netBadge = user.totalNetworkCount > 0
            ? `<div class="tree-net-badge" style="background:${hex}20;color:${hex};"><i class="fas fa-users" style="font-size:0.62rem;"></i><span>${user.totalNetworkCount}</span></div>`
            : '';
        return `
        <div class="tree-user-row">
            <div class="tree-user-avatar ${avatarColor(user.level)}" style="background:${hex}30;color:${hex};">${initials}</div>
            <div class="tree-user-info">
                <div class="tree-user-name-row">
                    <span class="tree-user-name">${escapeHtml(user.name)}</span>
                    ${user.isActive&&!user.isPlaceholder ? '<span class="tree-active-dot"></span>' : ''}
                </div>
                <div class="tree-user-credits-row">
                    <i class="fas fa-gift tree-credits-icon"></i><span class="tree-credits-val">${credits} credits</span>
                    <i class="fas fa-chart-line tree-credits-icon"></i><span class="tree-credits-val">${pool}</span>
                    <i class="fas fa-layer-group tree-credits-icon"></i>
                </div>
            </div>
            <div class="tree-right">${netBadge}${transferBtn}</div>
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════
    //  NETWORK — LIST MODE  (matches app NetworkListView: collapsible flat list)
    // ════════════════════════════════════════════════════════════════════
    function renderListNode(user, level, isRoot) {
        const hasChildren = !!(user.directChildren && user.directChildren.length > 0);
        const uid = escapeAttr(user.id);

        if (isRoot) {
            const childRows = hasChildren
                ? user.directChildren.map(c => renderListNode(c, level + 1, false)).join('')
                : '';
            return `
            <div class="net-list-section">
                <div class="tree-root-card${hasChildren ? ' net-root-clickable' : ''}" id="root-card-${uid}"
                     ${hasChildren ? `onclick="toggleNetSection('${uid}')"` : ''}>
                    <div class="tree-root-header">
                        <div class="tree-root-avatar"><i class="fas fa-user"></i></div>
                        <div style="flex:1;">
                            <div class="tree-root-name">${escapeHtml(user.name)}</div>
                            <div class="tree-root-lbl">You (Root)</div>
                        </div>
                        ${hasChildren ? `<i class="fas fa-chevron-down" id="chevron-root-${uid}" style="color:#6B7280;transition:transform 0.2s;font-size:0.9rem;"></i>` : ''}
                    </div>
                    <div class="tree-root-stats">
                        <span><i class="fas fa-users" style="color:#10B981;"></i> ${user.totalNetworkCount} Users</span>
                        <span><i class="fas fa-code-branch" style="color:#3B82F6;"></i> ${user.directChildren.length} Direct</span>
                    </div>
                </div>
                <div class="net-children-wrap" id="net-children-${uid}">${childRows}</div>
            </div>`;
        }

        // Non-root: indented row with optional expand button
        const childRows = hasChildren
            ? user.directChildren.map(c => renderListNode(c, level + 1, false)).join('')
            : '';
        const indent = (level - 1) * 12;
        return `
        <div class="net-list-item" style="margin-left:${indent}px;">
            <div class="net-list-item-top">
                ${hasChildren
                    ? `<button class="net-expand-btn" data-net-uid="${uid}"><i class="fas fa-chevron-right tree-chevron" style="font-size:0.65rem;color:#6B7280;transition:transform 0.2s;"></i></button>`
                    : '<span class="net-expand-spacer"></span>'}
                <div style="flex:1;">${buildUserCard(user, level === 1)}</div>
            </div>
            ${hasChildren ? `<div class="net-children-wrap" id="net-children-${uid}" style="display:none;">${childRows}</div>` : ''}
        </div>`;
    }

    window.toggleNetSection = function(uid) {
        const wrap    = document.getElementById('net-children-' + uid);
        const chevron = document.getElementById('chevron-root-' + uid);
        if (!wrap) return;
        const isOpen = wrap.style.display !== 'none';
        wrap.style.display = isOpen ? 'none' : 'block';
        if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
    };

    // ════════════════════════════════════════════════════════════════════
    //  NETWORK — TREE MODE  (matches app NetworkTreeView: connector lines)
    // ════════════════════════════════════════════════════════════════════
    function renderTreeNodeView(user, level, isRoot, isLast) {
        const hasChildren = !!(user.directChildren && user.directChildren.length > 0);

        if (isRoot) {
            const childrenHtml = hasChildren
                ? `<div class="tree-children-indent">${user.directChildren.map((c, i) => renderTreeNodeView(c, level + 1, false, i === user.directChildren.length - 1)).join('')}</div>`
                : '';
            return `
            <div class="tree-root-wrap">
                <div class="tree-root-card">
                    <div class="tree-root-header">
                        <div class="tree-root-avatar"><i class="fas fa-user"></i></div>
                        <div style="flex:1;">
                            <div class="tree-root-name">${escapeHtml(user.name)}</div>
                            <div class="tree-root-lbl">You (Root)</div>
                        </div>
                    </div>
                    <div class="tree-root-stats">
                        <span><i class="fas fa-users" style="color:#10B981;"></i> ${user.totalNetworkCount} Users</span>
                        <span><i class="fas fa-code-branch" style="color:#3B82F6;"></i> ${user.directChildren.length} Direct</span>
                    </div>
                </div>
                ${childrenHtml}
            </div>`;
        }

        const childrenHtml = hasChildren
            ? `<div class="tree-children-indent tree-children-sub">${user.directChildren.map((c, i) => renderTreeNodeView(c, level + 1, false, i === user.directChildren.length - 1)).join('')}</div>`
            : '';

        return `
        <div class="tree-node-outer${isLast ? ' tree-node-last' : ''}">
            <div class="tree-conn-wrap">
                <div class="tree-conn-v${isLast ? ' last' : ''}"></div>
                <div class="tree-conn-h"></div>
            </div>
            ${buildUserCard(user, level === 1)}
            ${childrenHtml}
        </div>`;
    }

    // ─── Render dispatcher ────────────────────────────────────────────────────
    function renderNetworkView(mode) {
        const container = document.getElementById('networkTreeContainer');
        if (!container || !state.networkTree) return;

        if (mode === 'list') {
            container.innerHTML = renderListNode(state.networkTree, 0, true);
            // Wire expand buttons for non-root nodes
            container.querySelectorAll('[data-net-uid]').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const uid = btn.dataset.netUid;
                    const wrap = document.getElementById('net-children-' + uid);
                    if (!wrap) return;
                    const isOpen = wrap.style.display !== 'none';
                    wrap.style.display = isOpen ? 'none' : 'block';
                    const chevron = btn.querySelector('.tree-chevron');
                    if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
                });
            });
        } else {
            container.innerHTML = `<div style="overflow-x:auto;">${renderTreeNodeView(state.networkTree, 0, true, false)}</div>`;
        }
    }

    window.switchDashTab=function(name,btn){
        document.querySelectorAll('.dash-vtab').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.dash-vtab-pane').forEach(p=>p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('pane-'+name)?.classList.add('active');
    };

    function toggleTransferHistory(){
        document.getElementById('thToggleBtn')?.classList.toggle('open');
        document.getElementById('transferHistoryList')?.classList.toggle('open');
    }
    window.toggleTransferHistory=toggleTransferHistory;

    // ─── Buy Vouchers ──────────────────────────────────────────────────────────
    window.openBuyVouchersPanel=function(){
        const panel=document.getElementById('buyVouchersPanel'); if(!panel) return;
        panel.style.display='flex'; state.buyQuantity=5; state.buyTimer=3600; updateBuyUI(); startBuyTimer();
    };
    window.closeBuyVouchersPanel=function(){
        const panel=document.getElementById('buyVouchersPanel'); if(panel) panel.style.display='none'; clearInterval(state.buyTimerInterval);
    };
    function changeBuyQty(delta){const nq=state.buyQuantity+delta;if(nq>=5&&nq%5===0){state.buyQuantity=nq;updateBuyUI();}}
    function updateBuyUI(){
        const qty=state.buyQuantity; const sets=Math.floor(qty/5); const orig=sets*6000; const disc=sets*3600; const sav=orig-disc;
        set('buyQtyDisplay',qty); set('buyOriginalPrice','₹'+orig.toLocaleString('en-IN')); set('buyDiscount','-₹'+sav.toLocaleString('en-IN'));
        set('buyTotal','₹'+disc.toLocaleString('en-IN')); set('buySavings','You save ₹'+sav.toLocaleString('en-IN')+'!'); set('buyBtnLabel','Pay ₹'+disc.toLocaleString('en-IN')+' via Payment Gateway');
        const mb=document.getElementById('buyQtyMinus'); if(mb) mb.disabled=qty<=5;
    }
    function startBuyTimer(){
        clearInterval(state.buyTimerInterval);
        state.buyTimerInterval=setInterval(()=>{
            state.buyTimer=Math.max(0,state.buyTimer-1); set('buyTimerDisplay',formatTimer(state.buyTimer));
            if(state.buyTimer<=0){clearInterval(state.buyTimerInterval);showToast('Purchase window expired.','error');window.closeBuyVouchersPanel();}
        },1000);
        set('buyTimerDisplay',formatTimer(state.buyTimer));
    }
    async function handleBuyNow(){
        const qty=state.buyQuantity; const sets=Math.floor(qty/5); const total=sets*3600;
        if(!confirm(`Confirm purchase of ${qty} vouchers for ₹${total.toLocaleString('en-IN')}?`)) return;
        const btn=document.getElementById('confirmBuyBtn'); if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin me-1"></i>Processing…';}
        try{const res=await apiFetch('/mlm/vouchers/purchase','POST',{quantity:qty,totalAmount:total,paymentMethod:'razorpay'});
            if(res?.success){showToast(`Successfully purchased ${qty} vouchers!`,'success');window.closeBuyVouchersPanel();loadDashboard();}
            else showToast(res?.message||'Purchase failed','error');}
        catch{showToast('Purchase failed. Please try again.','error');}
        finally{if(btn){btn.disabled=false;set('buyBtnLabel','Pay ₹'+(sets*3600).toLocaleString('en-IN')+' via Payment Gateway');}}
    }

    // ─── Transfer Credits ──────────────────────────────────────────────────────
    window.openTransferCreditsModal=function(id,name,phone){
        state.selectedBuyerId=id; state.selectedBuyerName=name;
        set('tcRecipientName',name); set('tcRecipientPhone',phone); set('tcAvailableCredits',fmtNum(state.metrics.availableCredits||0)+' credits');
        const inp=document.getElementById('tcAmount'); if(inp) inp.value='1';
        document.getElementById('tcError')?.classList.add('d-none');
        new bootstrap.Modal(document.getElementById('transferCreditsModal')).show();
    };
    async function handleTransferCreditsConfirm(){
        const amount=parseInt(document.getElementById('tcAmount')?.value)||1; const errorDiv=document.getElementById('tcError');
        if(amount<1||amount>5){if(errorDiv){errorDiv.textContent='Amount must be between 1 and 5 credits';errorDiv.classList.remove('d-none');}return;}
        const btn=document.getElementById('confirmTransferCreditsBtn'); if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin me-1"></i>Transferring…';}
        try{const res=await apiFetch('/mlm/credits/transfer','POST',{receiverId:state.selectedBuyerId,amount,note:'Transfer from website'});
            if(res?.success){bootstrap.Modal.getInstance(document.getElementById('transferCreditsModal'))?.hide();showToast(`Credits transferred to ${state.selectedBuyerName}!`,'success');loadDashboard();}
            else if(errorDiv){errorDiv.textContent=res?.message||'Transfer failed';errorDiv.classList.remove('d-none');}}
        catch{if(errorDiv){errorDiv.textContent='Transfer failed. Please try again.';errorDiv.classList.remove('d-none');}}
        finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-coins me-1"></i>Transfer Credits';}}
    }

    // ─── Transfer Voucher ──────────────────────────────────────────────────────
    window.openTransferVoucherToBuyer=function(id,name,phone){
        if(state.isVoucherAdmin){openAdminVoucherTransferModal(phone,name);return;}
        const u=state.vouchers.find(v=>v.redeemedStatus==='unredeemed'&&!v.isSpecialCreditsVoucher);
        if(!u){showToast('No available vouchers to transfer','error');return;}
        openVoucherTransferModal(u,phone);
    };
    function openVoucherTransferModal(voucher,prefillPhone){
        document.getElementById('transferVoucherNumber').value=voucher.voucherNumber||'Voucher';
        document.getElementById('recipientPhone').value=prefillPhone||'';
        document.getElementById('transferQty').value='1';
        document.getElementById('transferError')?.classList.add('d-none');
        const btn=document.getElementById('confirmTransferBtn'); btn.dataset.voucherId=voucher._id; btn.dataset.isAdmin='false';
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    }
    window.openAdminVoucherTransferModal=function(phone,name){
        document.getElementById('transferVoucherNumber').value='ADMIN-TRANSFER';
        document.getElementById('recipientPhone').value=phone||'';
        document.getElementById('transferQty').value='1';
        document.getElementById('transferError')?.classList.add('d-none');
        const btn=document.getElementById('confirmTransferBtn'); btn.dataset.voucherId='admin-voucher-transfer'; btn.dataset.isAdmin='true';
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    };
    window.openSpecialTransferModal=function(slotNumber,slotName){
        document.getElementById('transferVoucherNumber').value=`Slot ${slotNumber} — ${slotName}`;
        document.getElementById('recipientPhone').value='';
        document.getElementById('transferQty').value='1';
        document.getElementById('transferError')?.classList.add('d-none');
        const btn=document.getElementById('confirmTransferBtn'); btn.dataset.voucherId='admin-voucher-transfer'; btn.dataset.isAdmin='true';
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    };
    async function handleTransferVoucherConfirm(){
        const voucherId=this.dataset.voucherId; const isAdmin=this.dataset.isAdmin==='true';
        const phone=document.getElementById('recipientPhone').value.trim();
        const qty=parseInt(document.getElementById('transferQty')?.value||'1');
        const errorDiv=document.getElementById('transferError');
        if(!phone){if(errorDiv){errorDiv.textContent='Please enter recipient phone number';errorDiv.classList.remove('d-none');}return;}
        this.disabled=true; this.innerHTML='<i class="fas fa-spinner fa-spin me-1"></i>Transferring…';
        try{
            const endpoint=(isAdmin||voucherId==='admin-voucher-transfer')?'/mlm/vouchers/admin-transfer':`/mlm/vouchers/${voucherId}/transfer`;
            const res=await apiFetch(endpoint,'POST',{recipientPhone:phone,quantity:qty});
            if(res?.success){bootstrap.Modal.getInstance(document.getElementById('transferModal'))?.hide();showToast('Voucher transferred successfully!','success');loadDashboard();}
            else if(errorDiv){errorDiv.textContent=res?.message||'Transfer failed';errorDiv.classList.remove('d-none');}
        }catch{if(errorDiv){errorDiv.textContent='Transfer failed. Please try again.';errorDiv.classList.remove('d-none');}}
        finally{this.disabled=false;this.innerHTML='<i class="fas fa-paper-plane me-1"></i>Transfer';}
    }

    async function handleRedeem(voucherId){
        if(!confirm('Redeem this voucher?')) return;
        try{const res=await apiFetch(`/mlm/vouchers/${voucherId}/redeem`,'POST');
            if(res?.success){showToast(res.message||'Voucher redeemed!','success');loadDashboard();}
            else showToast(res?.message||'Redemption failed','error');}
        catch{showToast('Redemption failed. Please try again.','error');}
    }

    // ─── Core helpers ─────────────────────────────────────────────────────────
    async function apiFetch(path,method='GET',body=null){
        const token=localStorage.getItem(AUTH_TOKEN_KEY);
        const opts={method,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}};
        if(body) opts.body=JSON.stringify(body);
        const res=await fetch(API_BASE_URL+path,opts);
        if(res.status===401){localStorage.removeItem(AUTH_TOKEN_KEY);window.location.href='voucher-login.html';return null;}
        return res.json();
    }
    function getVal(settled){return settled.status==='fulfilled'?settled.value:null;}
    function getVoucherStatus(v){if(v.redeemedStatus==='redeemed')return 'Redeemed';if(v.redeemedStatus==='expired'||new Date(v.expiryDate)<new Date())return 'Expired';return 'Active';}
    function set(id,val){const el=document.getElementById(id);if(el) el.textContent=val;}
    function fmtNum(n){if(n===undefined||n===null)return '0';n=Number(n);if(n>=10000000)return (n/10000000).toFixed(2)+'Cr';if(n>=100000)return (n/100000).toFixed(2)+'L';if(n>=1000)return (n/1000).toFixed(1)+'K';return n.toLocaleString('en-IN');}
    function fmtCreditsAmt(n){if(!n)return '0';n=Number(n);if(n>=10000000)return (n/10000000).toFixed(2)+' Cr';if(n>=100000)return (n/100000).toFixed(2)+' Lacs';if(n>=1000)return (n/1000).toFixed(1)+'K';return n.toLocaleString('en-IN');}
    function formatDate(d){if(!d)return '—';return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
    function formatCountdown(target){if(!target)return '--';const diff=new Date(target).getTime()-Date.now();if(diff<=0)return 'Expired';return `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`;}
    function formatTimer(s){return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
    function escapeHtml(text){if(!text)return '';const d=document.createElement('div');d.textContent=text;return d.innerHTML;}
    function escapeAttr(text){if(!text)return '';return String(text).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function showToast(msg,type='success'){const t=document.getElementById('toastBar');if(!t)return;t.textContent=msg;t.className=`toast-bar ${type} show`;setTimeout(()=>t.classList.remove('show'),3500);}

    window.logout=()=>{localStorage.removeItem(AUTH_TOKEN_KEY);window.location.href='voucher-login.html';};

})();
