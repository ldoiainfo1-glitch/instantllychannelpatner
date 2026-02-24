// Vouchers Dashboard for Channel Partner — mirrors InstantllyCards app (VoucherDashboard.tsx)
(function () {
    'use strict';

    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://api.instantllycards.com/api';

    const AUTH_TOKEN_KEY = 'authToken';

    // ─── App state (mirrors VoucherDashboard.tsx state) ──────────────────────
    let state = {
        isVoucherAdmin: false,
        isMLMUser: false,
        metrics: {},
        creditStats: {},
        discountSummary: {},
        vouchers: [],
        directBuyers: [],
        distributionCredits: [],
        networkTree: null,
        specialCredits: null,
        networkSlots: [],
        // Buy Vouchers
        buyQuantity: 5,
        buyTimer: 3600,
        buyTimerInterval: null,
        // Transfer
        selectedBuyerId: null,
        selectedBuyerName: '',
        selectedBuyerPhone: '',
        selectedVoucherId: null,
        networkViewMode: 'list', // 'list' | 'tree'
    };

    // ─── Init ─────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
            window.location.href = 'voucher-login.html';
            return;
        }
        initEventListeners();
        loadDashboard();
    });

    function initEventListeners() {
        document.getElementById('refreshVouchersBtn')?.addEventListener('click', loadDashboard);
        document.getElementById('confirmTransferCreditsBtn')?.addEventListener('click', handleTransferCreditsConfirm);
        document.getElementById('confirmTransferBtn')?.addEventListener('click', handleTransferVoucherConfirm);
        document.getElementById('buyQtyMinus')?.addEventListener('click', () => changeBuyQty(-5));
        document.getElementById('buyQtyPlus')?.addEventListener('click', () => changeBuyQty(5));
        document.getElementById('confirmBuyBtn')?.addEventListener('click', handleBuyNow);
        document.getElementById('historyBtn')?.addEventListener('click', () => window.location.href = 'credits-history.html');
        document.getElementById('netViewList')?.addEventListener('click', () => setNetworkView('list'));
        document.getElementById('netViewTree')?.addEventListener('click', () => setNetworkView('tree'));
    }

    // ─── Load all data in parallel (mirrors VoucherDashboard.tsx loadDashboard) ─
    async function loadDashboard() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return;

        try {
            const [
                overviewRes, creditRes, discountRes, voucherRes,
                userProfileRes, distributionRes, treeRes, buyerRes,
            ] = await Promise.allSettled([
                apiFetch('/mlm/overview'),
                apiFetch('/mlm/credits/dashboard'),
                apiFetch('/mlm/discount/summary'),
                apiFetch('/mlm/vouchers?limit=20'),
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

            // Determine user type (mirrors VoucherDashboard.tsx isVoucherAdmin check)
            const isAdmin = overview?.user?.isVoucherAdmin === true;
            state.isVoucherAdmin = isAdmin;
            state.isMLMUser = !!(userProfile?.user?.introducerId);

            // Load special credits data if admin (mirrors admin-specific loadDashboard logic)
            if (isAdmin) {
                try {
                    const [scRes, nsRes] = await Promise.allSettled([
                        apiFetch('/mlm/special-credits/dashboard'),
                        apiFetch('/mlm/special-credits/network'),
                    ]);
                    state.specialCredits = getVal(scRes)?.dashboard || null;
                    state.networkSlots   = getVal(nsRes)?.networkUsers || [];
                } catch (e) { /* ignore */ }
            }

            // Set metrics — admin uses special credits data (mirrors SummaryCard admin override)
            if (isAdmin && state.specialCredits) {
                const sc = state.specialCredits;
                state.metrics = {
                    availableCredits:         sc.specialCredits?.balance || 0,
                    totalVouchersTransferred:  sc.specialCredits?.totalSent || 0,
                    totalNetworkUsers:         sc.slots?.used || 0,
                    virtualCommission:         sc.specialCredits?.totalSent || 0,
                    currentDiscountPercent:    0,
                    vouchersFigure:            sc.vouchersFigure || 0,
                };
            } else if (overview?.metrics) {
                state.metrics = overview.metrics;
            }

            // Credit stats
            if (creditDashboard) {
                state.creditStats = {
                    totalCreditReceived:    creditDashboard.totalCreditsReceived || 0,
                    totalCreditTransferred: creditDashboard.totalCreditsTransferred || 0,
                    totalCreditBalance:     creditDashboard.creditBalance || 0,
                    recentTransfers:        creditDashboard.recentTransfers || [],
                    timers:                 creditDashboard.timers || [],
                };
            }

            if (discount?.summary) state.discountSummary = discount.summary;

            // Vouchers — always include the special Instantlly voucher at top (mirrors app behaviour)
            state.vouchers = voucherData?.vouchers || [];

            state.distributionCredits = distribution?.credits || [];
            state.directBuyers        = buyerData?.buyers || [];

            // Build network tree (mirrors mapTree in VoucherDashboard.tsx)
            if (treeData?.tree) {
                state.networkTree = mapTree(treeData.tree);
            }

            // For admin, override network tree with slot users (mirrors admin root node creation)
            if (isAdmin && state.networkSlots.length > 0) {
                state.networkTree = {
                    id: overview?.user?.id || 'admin',
                    name: overview?.user?.name || 'Admin',
                    phone: overview?.user?.phone || '',
                    level: 0,
                    directChildren: state.networkSlots.map(slot => ({
                        id: slot.id || `placeholder-${slot.slotNumber}`,
                        name: slot.name || `User ${slot.slotNumber}`,
                        phone: slot.phone || 'Not assigned',
                        level: slot.recipientLevel || slot.level || slot.slotNumber || 1,
                        directChildren: [],
                        totalNetworkCount: 0,
                        directCount: 0,
                        joinedDate: slot.sentAt || new Date().toISOString(),
                        isActive: !slot.isPlaceholder,
                        isPlaceholder: slot.isPlaceholder !== false,
                        creditsReceived: slot.credits || 0,
                    })),
                    totalNetworkCount: state.networkSlots.length,
                    directCount: state.networkSlots.length,
                    joinedDate: overview?.user?.createdAt || new Date().toISOString(),
                };
            }

            // Render all sections
            applyAdminUI();
            renderNetworkOverview();
            renderVoucherStatsCard();
            renderDistributionCreditsTable();
            renderCreditStats();
            renderDiscountSummary();
            renderDirectBuyers();
            renderVouchersList();
            renderNetworkTree();

        } catch (err) {
            console.error('Dashboard load error:', err);
            showToast('Failed to load dashboard', 'error');
        }
    }

    // Map tree node (mirrors mapTree in VoucherDashboard.tsx)
    function mapTree(node) {
        const children = (node.directChildren || []).map(mapTree);
        const totalNetworkCount = children.reduce((sum, c) => sum + 1 + c.totalNetworkCount, 0);
        return {
            id: node.id,
            name: node.name,
            phone: node.phone,
            level: node.level || 0,
            directChildren: children,
            totalNetworkCount,
            directCount: node.directCount || children.length,
            structuralCreditPool: node.structuralCreditPool,
            joinedDate: node.joinedDate,
            isActive: true,
            isPlaceholder: node.isPlaceholder || false,
            creditsReceived: node.creditsReceived || 0,
        };
    }

    // ─── Apply admin/regular UI differences (mirrors VoucherDashboard admin logic) ─
    function applyAdminUI() {
        const isAdmin = state.isVoucherAdmin;

        // Hero subtitle
        const heroSub = document.querySelector('.hero-sub');
        if (heroSub) heroSub.textContent = isAdmin ? 'Sales Target at Special Discount' : '5× Referral Credit Distribution';

        // VoucherStatsCard — hidden for admin (mirrors !isVoucherAdmin check)
        const vsc = document.getElementById('voucherStatsCard');
        if (vsc) vsc.style.display = isAdmin ? 'none' : 'block';

        // DiscountCard — hidden for admin
        const dc = document.getElementById('discountCard');
        if (dc) dc.style.display = isAdmin ? 'none' : 'block';

        // VouchersList section — hidden for admin
        const vl = document.getElementById('vouchersListCard');
        if (vl) vl.style.display = isAdmin ? 'none' : 'block';

        // Stats row: hide Virtual Savings for admin
        const vsStat = document.getElementById('virtualSavingsStat');
        if (vsStat) vsStat.style.display = isAdmin ? 'none' : '';

        // Admin Transfer button in direct buyers header — only for admin
        const adminTransferBtn = document.getElementById('adminTransferBtn');
        if (adminTransferBtn) adminTransferBtn.style.display = isAdmin ? 'flex' : 'none';
    }

    // ─── Section 1: Network Overview (mirrors SummaryCard.tsx) ───────────────
    function renderNetworkOverview() {
        const m = state.metrics;
        set('ovAvailableCredits',  fmtNum(m.availableCredits));
        set('ovCreditsDistributed', fmtNum(m.totalVouchersTransferred));
        set('ovNetworkUsers',      fmtNum(m.totalNetworkUsers));
        set('ovVirtualSavings',    '₹' + fmtNum(m.virtualCommission));

        // Available Vouchers (visible for admin with vouchersFigure)
        const avRow = document.getElementById('ovAvailableVouchersRow');
        if (avRow) {
            if (m.vouchersFigure && m.vouchersFigure > 0) {
                avRow.style.display = '';
                set('ovAvailableVouchers', fmtNum(m.vouchersFigure));
            } else {
                avRow.style.display = 'none';
            }
        }
    }

    // ─── VoucherStatsCard (mirrors VoucherStatsCard.tsx) ─────────────────────
    function renderVoucherStatsCard() {
        if (state.isVoucherAdmin) return;
        const vouchers = state.vouchers;
        const available = vouchers.filter(v => !v.redeemedStatus || v.redeemedStatus === 'unredeemed').length;
        const redeemed  = vouchers.filter(v => v.redeemedStatus === 'redeemed').length;
        const total     = vouchers.length;

        set('vsAvailable', available);
        set('vsTotal',     total);
        set('vsRedeemed',  redeemed);

        // Update top stats row counts
        set('totalVouchersCount', total);
        set('purchasedCount',     vouchers.filter(v => v.source === 'purchase').length);
        set('receivedCount',      vouchers.filter(v => v.source === 'transfer' || v.source === 'admin').length);
        set('sentCount',          '—');
    }

    // ─── DistributionCreditsTable (mirrors DistributionCreditsTable.tsx) ──────
    function renderDistributionCreditsTable() {
        const card = document.getElementById('distributionCreditsCard');
        if (!card) return;

        const credits = state.distributionCredits;
        // Show only for MLM users with distribution credits (mirrors isMLMUser check)
        if (!state.isMLMUser || credits.length === 0) {
            card.style.display = 'none';
            return;
        }
        card.style.display = 'block';

        const tbody = document.getElementById('distributionTableBody');
        if (!tbody) return;

        tbody.innerHTML = credits.map(c => {
            const vCount   = c.vouchersShared || 0;
            const isLocked = c.isLocked !== false;
            const color    = isLocked ? '#ef4444' : '#10b981';
            const lockIcon = isLocked ? 'fa-lock' : 'fa-lock-open';
            const label    = isLocked ? 'Locked' : 'Ready';
            const amt      = fmtCreditsAmt(c.creditsToTransfer);

            return `<tr>
                <td class="dist-td">${c.level}</td>
                <td class="dist-td">
                    <div class="dist-name">${escapeHtml(c.recipientName)}</div>
                    <div class="dist-phone">${escapeHtml(c.recipientPhone)}</div>
                </td>
                <td class="dist-td dist-credits">₹${amt}</td>
                <td class="dist-td">
                    <span style="font-size:0.8rem;font-weight:700;color:${vCount >= 5 ? '#10b981' : '#f59e0b'}">
                        <i class="fas fa-ticket-alt" style="font-size:0.7rem;"></i> ${vCount}/5
                    </span>
                </td>
                <td class="dist-td">
                    <span style="font-size:0.75rem;font-weight:700;color:${color};background:${color}15;padding:3px 8px;border-radius:6px;">
                        <i class="fas ${lockIcon}" style="font-size:0.7rem;"></i> ${label}
                    </span>
                </td>
                <td class="dist-td">
                    <button class="dist-transfer-btn${isLocked ? ' dist-locked' : ''}"
                        ${isLocked ? 'disabled' : ''}
                        onclick="triggerDistributionTransfer('${c.recipientId}', ${c.creditsToTransfer})">
                        ${isLocked ? '<i class="fas fa-lock me-1" style="font-size:0.7rem;"></i>Locked' : 'Transfer <i class="fas fa-arrow-right ms-1" style="font-size:0.7rem;"></i>'}
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    window.triggerDistributionTransfer = async function (recipientId, amount) {
        if (!confirm('Transfer credits to this person?')) return;
        try {
            const res = await apiFetch('/mlm/credits/transfer', 'POST', { receiverId: recipientId, amount: 1, note: 'Distribution credit transfer' });
            if (res?.success) { showToast('Credits transferred!', 'success'); loadDashboard(); }
            else showToast(res?.message || 'Transfer failed', 'error');
        } catch { showToast('Transfer failed. Please try again.', 'error'); }
    };

    // ─── Credit Statistics (mirrors CreditStatisticsCard.tsx) ────────────────
    function renderCreditStats() {
        const d = state.creditStats;
        const bal = d.totalCreditBalance || 0;
        set('creditBalance', fmtNum(bal) + ' credits');
        set('csReceived',     fmtNum(d.totalCreditReceived || 0)    + ' credits');
        set('csTransferred',  fmtNum(d.totalCreditTransferred || 0) + ' credits');
        set('csBalance',      fmtNum(bal)                           + ' credits');
        set('csReceivedBack', '0 credits');

        const transfers = d.recentTransfers || [];
        set('thCount', transfers.length);
        const list = document.getElementById('transferHistoryList');
        if (list) {
            list.innerHTML = transfers.length === 0
                ? '<div style="font-size:0.85rem;color:#9ca3af;padding:0.5rem 0;">No transfers yet</div>'
                : transfers.map(t => {
                    const color = (t.status === 'completed' || t.status === 'approved') ? '#10b981'
                                : (t.status === 'pending' || t.status === 'waiting_approval') ? '#f59e0b' : '#ef4444';
                    const icon  = (t.status === 'completed' || t.status === 'approved') ? 'fa-check-circle'
                                : t.status === 'pending' ? 'fa-clock' : 'fa-times-circle';
                    const slabel = (t.status || 'pending').charAt(0).toUpperCase() + (t.status || 'pending').slice(1);
                    return `<div class="th-item">
                        <div class="th-left">
                            <div class="th-status-icon" style="background:${color}20;"><i class="fas ${icon}" style="color:${color};font-size:0.85rem;"></i></div>
                            <div>
                                <div class="th-name">${escapeHtml(t.recipientName || 'Unknown')}</div>
                                <div class="th-date">${formatDate(t.date)}</div>
                            </div>
                        </div>
                        <div class="th-right">
                            <div class="th-amount">₹${fmtNum(t.amount || 0)}</div>
                            <span class="th-status-badge" style="background:${color}20;color:${color};">${escapeHtml(slabel)}</span>
                        </div>
                    </div>`;
                }).join('');
        }

        const timers = d.timers || [];
        const timerSection = document.getElementById('timerSection');
        const timerRows    = document.getElementById('timerRows');
        if (timers.length > 0 && timerSection && timerRows) {
            timerSection.style.display = 'block';
            timerRows.innerHTML = timers.map(tm => {
                let label = 'Transfer', timeVal = '--';
                if (tm.paymentStatus === 'pending')           { label = 'Payment Pending'; timeVal = formatCountdown(tm.expiresAt); }
                else if (tm.paymentStatus === 'waiting_approval') { label = 'Admin Review'; timeVal = 'Pending'; }
                else { timeVal = formatCountdown(tm.transferExpiresAt); }
                return `<div class="timer-row">
                    <div class="timer-left"><i class="fas fa-hourglass-half" style="color:#4f46e5;font-size:0.85rem;"></i>${escapeHtml(label)}</div>
                    <div class="timer-value">${timeVal}</div>
                </div>`;
            }).join('');
        }
    }

    // ─── Discount Summary (mirrors DiscountDashboardCard.tsx) ────────────────
    function renderDiscountSummary() {
        if (state.isVoucherAdmin) return;
        const s = state.discountSummary;
        set('discLevel',      'Level ' + (s.currentLevel || 1));
        set('discPercent',    (s.discountPercent || 40) + '%');
        set('discPayable',    '₹' + fmtNum(s.payableAmount || 3600));
        set('discVirtual',    '₹' + fmtNum(s.virtualCommission || 0));
        set('discDisclaimer', s.disclaimer || 'This amount represents savings unlocked via discounts and is not withdrawable.');
        if (s.nextLevelTarget) {
            const pb = document.getElementById('discProgressBox');
            if (pb) pb.style.display = 'block';
            set('discProgressText', `Level ${s.nextLevelTarget.level} · ${s.nextLevelTarget.targetDiscountPercent}% discount`);
            set('discProgressSub',  `${s.nextLevelTarget.remainingDownline} more members needed`);
        }
    }

    // ─── Direct Buyers (mirrors DirectBuyersList.tsx) ─────────────────────────
    function renderDirectBuyers() {
        const container = document.getElementById('directBuyersList');
        if (!container) return;
        const buyers = state.directBuyers;
        if (buyers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:1.5rem;">
                    <div class="empty-icon-wrap" style="width:52px;height:52px;font-size:1.4rem;"><i class="fas fa-user-friends"></i></div>
                    <div class="empty-title" style="font-size:0.95rem;">No direct buyers yet</div>
                    <div class="empty-sub">People who join through your link will appear here</div>
                </div>`;
            return;
        }
        container.innerHTML = buyers.map(b => `
            <div class="buyer-entry">
                <div class="buyer-row">
                    <div>
                        <div class="buyer-name">${escapeHtml(b.name || 'Unknown')}</div>
                        <div class="buyer-meta">${escapeHtml(b.phone || '')}${b.teamSize !== undefined ? ` · Team: ${b.teamSize}` : ''}</div>
                    </div>
                    ${b.phone ? `<a class="btn-call" href="tel:${escapeHtml(b.phone)}"><i class="fas fa-phone" style="font-size:0.8rem;"></i> Call</a>` : ''}
                </div>
                ${!state.isVoucherAdmin ? `
                <div class="buyer-btn-row">
                    <button class="btn-transfer-credits-buyer" onclick="openTransferCreditsModal('${escapeHtml(b.id)}','${escapeHtml(b.name)}','${escapeHtml(b.phone || '')}')">
                        <i class="fas fa-coins"></i> Transfer Credits
                    </button>
                    <button class="btn-transfer-voucher-buyer" onclick="openTransferVoucherToBuyer('${escapeHtml(b.id)}','${escapeHtml(b.name)}','${escapeHtml(b.phone || '')}')">
                        <i class="fas fa-ticket-alt"></i> Transfer Vouchers
                    </button>
                </div>` : ''}
            </div>`).join('');
    }

    // ─── Vouchers List (mirrors VoucherList.tsx) ──────────────────────────────
    function renderVouchersList() {
        if (state.isVoucherAdmin) return;
        const vouchers = state.vouchers;
        const all      = vouchers;
        const purchased = vouchers.filter(v => v.source === 'purchase');
        const received  = vouchers.filter(v => v.source === 'transfer' || v.source === 'admin');

        set('allBadge',       all.length);
        set('purchasedBadge', purchased.length);
        set('receivedBadge',  received.length);
        set('sentBadge',      '—');

        renderVoucherTab('all',       all);
        renderVoucherTab('purchased', purchased);
        renderVoucherTab('received',  received);
        renderVoucherTab('sent',      []);
    }

    function renderVoucherTab(type, vouchers) {
        const container = document.getElementById(`${type}VouchersList`);
        if (!container) return;
        if (!vouchers || vouchers.length === 0) {
            const labels = { all: 'All', purchased: 'Purchased', received: 'Received', sent: 'Sent' };
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon-wrap"><i class="fas fa-ticket-alt"></i></div>
                    <div class="empty-title">No ${labels[type] || type} vouchers yet</div>
                    <div class="empty-sub">Your ${type} vouchers will appear here once available</div>
                </div>`;
            return;
        }
        container.innerHTML = vouchers.map(v => createVoucherCard(v, type)).join('');
        vouchers.forEach(v => {
            document.getElementById(`detail-${v._id}`)?.addEventListener('click', () => openDetailModal(v));
            document.getElementById(`transfer-${v._id}`)?.addEventListener('click', () => openVoucherTransferModal(v));
            document.getElementById(`redeem-${v._id}`)?.addEventListener('click', () => handleRedeem(v._id));
        });
    }

    function createVoucherCard(voucher, listType) {
        const status       = getVoucherStatus(voucher);
        const statusPill   = status === 'Active' ? 'status-unredeemed' : status === 'Redeemed' ? 'status-redeemed' : 'status-expired';
        const displayAmt   = voucher.amount || voucher.MRP || 1200;
        const discPct      = voucher.discountPercentage || 0;
        const mrp          = voucher.MRP || 0;
        const sourceClass  = `source-${voucher.source || 'purchase'}`;
        const sourceLabel  = voucher.source ? (voucher.source.charAt(0).toUpperCase() + voucher.source.slice(1)) : 'Purchase';
        const canTransfer  = voucher.redeemedStatus === 'unredeemed' && new Date(voucher.expiryDate) > new Date() && listType !== 'sent' && !voucher.isSpecialCreditsVoucher;
        const canRedeem    = voucher.redeemedStatus === 'unredeemed' && new Date(voucher.expiryDate) > new Date() && !voucher.isSpecialCreditsVoucher;
        const transferInfo = getTransferInfo(voucher, listType);
        return `
        <div class="voucher-ticket">
            <div class="voucher-ticket-top">
                <div class="biz-logo"><i class="fas fa-bolt"></i></div>
                <div class="voucher-ticket-info">
                    <div class="voucher-biz-name">${escapeHtml(voucher.companyName || 'Instantlly')}</div>
                    <div class="voucher-number-display">#${escapeHtml(voucher.voucherNumber)}</div>
                    ${transferInfo ? `<div style="font-size:0.75rem;color:#6b7280;margin-top:3px;"><i class="fas fa-info-circle" style="font-size:0.7rem;"></i> ${escapeHtml(transferInfo)}</div>` : ''}
                </div>
                <div class="voucher-amount-wrap">
                    <div class="voucher-amount-value">₹${Number(displayAmt).toLocaleString('en-IN')}</div>
                    <div class="voucher-amount-label">${discPct > 0 ? `MRP ₹${Number(mrp).toLocaleString('en-IN')}` : 'Value'}</div>
                </div>
                ${discPct > 0 ? `<span class="discount-badge">-${discPct}%</span>` : ''}
            </div>
            <div class="voucher-ticket-bottom">
                <div class="voucher-meta">
                    <span class="voucher-meta-item"><i class="fas fa-calendar"></i>${formatDate(voucher.issueDate)}</span>
                    <span class="voucher-validity"><i class="fas fa-star"></i>Valid till ${formatDate(voucher.expiryDate)}</span>
                    <span class="source-tag ${sourceClass}">${sourceLabel}</span>
                    <span class="voucher-status-pill ${statusPill}">${status}</span>
                </div>
                <div class="voucher-ticket-actions">
                    <button class="btn-view-v" id="detail-${voucher._id}">Details</button>
                    ${canTransfer ? `<button class="btn-transfer-v" id="transfer-${voucher._id}"><i class="fas fa-paper-plane" style="font-size:0.75rem;"></i> Transfer</button>` : ''}
                    ${canRedeem
                        ? `<button class="btn-redeem" id="redeem-${voucher._id}">Redeem →</button>`
                        : `<button class="btn-redeem" disabled>${status === 'Redeemed' ? 'Redeemed' : 'Expired'}</button>`}
                </div>
            </div>
        </div>`;
    }

    // ─── Network Tree/List View (mirrors NetworkListView.tsx + toggle) ─────────
    function renderNetworkTree() {
        const card = document.getElementById('networkTreeCard');
        if (!card) return;
        if (!state.networkTree) { card.style.display = 'none'; return; }
        card.style.display = 'block';
        renderNetworkView(state.networkViewMode);
    }

    function setNetworkView(mode) {
        state.networkViewMode = mode;
        const listBtn = document.getElementById('netViewList');
        const treeBtn = document.getElementById('netViewTree');
        if (listBtn) { listBtn.classList.toggle('net-toggle-active', mode === 'list'); }
        if (treeBtn) { treeBtn.classList.toggle('net-toggle-active', mode === 'tree'); }
        renderNetworkView(mode);
    }

    function renderNetworkView(mode) {
        const container = document.getElementById('networkTreeContainer');
        if (!container || !state.networkTree) return;
        container.innerHTML = renderTreeNode(state.networkTree, 0, true);
        // Attach toggle listeners
        container.querySelectorAll('[data-tree-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const childDiv = document.getElementById('children-' + btn.dataset.treeToggle);
                if (childDiv) {
                    const isOpen = childDiv.style.display !== 'none';
                    childDiv.style.display = isOpen ? 'none' : 'block';
                    const icon = btn.querySelector('.tree-chevron');
                    if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        });
    }

    function renderTreeNode(user, level, isRoot) {
        const hasChildren = user.directChildren && user.directChildren.length > 0;
        const indent      = level * 16;
        const childrenHtml = hasChildren
            ? `<div id="children-${escapeHtml(user.id)}" ${isRoot ? '' : 'style="display:none;"'}>
                   ${user.directChildren.map(c => renderTreeNode(c, level + 1, false)).join('')}
               </div>`
            : '';

        if (isRoot) {
            return `
            <div class="tree-root-card">
                <div class="tree-root-header">
                    <div class="tree-root-avatar"><i class="fas fa-user"></i></div>
                    <div class="tree-root-info">
                        <div class="tree-root-name">${escapeHtml(user.name)}</div>
                        <div class="tree-root-label">You (Root)</div>
                    </div>
                    ${hasChildren ? `<button class="tree-toggle-plain" data-tree-toggle="${escapeHtml(user.id)}">
                        <i class="fas fa-chevron-up tree-chevron" style="transition:transform 0.2s;color:#6b7280;font-size:0.9rem;"></i>
                    </button>` : ''}
                </div>
                <div class="tree-root-stats">
                    <span><i class="fas fa-users" style="color:#10b981;"></i> ${user.totalNetworkCount} Users</span>
                    <span><i class="fas fa-link" style="color:#3b82f6;"></i> ${user.directCount} Direct</span>
                </div>
            </div>
            ${childrenHtml}`;
        }

        return `
        <div class="tree-user-row" style="margin-left:${indent}px;">
            ${hasChildren
                ? `<button class="tree-toggle-plain" data-tree-toggle="${escapeHtml(user.id)}">
                       <i class="fas fa-chevron-right tree-chevron" style="transition:transform 0.2s;color:#6b7280;"></i>
                   </button>`
                : '<span class="tree-spacer"></span>'}
            <div class="tree-user-avatar-sm">${user.isPlaceholder ? '<i class="fas fa-user-clock" style="color:#9ca3af;"></i>' : '<i class="fas fa-user" style="color:#6b7280;"></i>'}</div>
            <div class="tree-user-info-wrap">
                <div class="tree-user-name">${escapeHtml(user.name)}</div>
                <div class="tree-user-meta">Lv.${user.level}${user.phone ? ' · ' + escapeHtml(user.phone) : ''}</div>
            </div>
            ${!user.isPlaceholder && state.isVoucherAdmin
                ? `<button class="tree-transfer-btn" onclick="openAdminVoucherTransferModal('${escapeHtml(user.phone || '')}','${escapeHtml(user.name)}')">
                       <i class="fas fa-send" style="font-size:0.7rem;"></i> Transfer
                   </button>`
                : (!user.isPlaceholder
                    ? `<button class="tree-transfer-btn" onclick="openTransferCreditsModal('${escapeHtml(user.id)}','${escapeHtml(user.name)}','${escapeHtml(user.phone || '')}')">
                           <i class="fas fa-coins" style="font-size:0.7rem;"></i> Credits
                       </button>`
                    : `<button class="tree-transfer-btn tree-transfer-slot" onclick="openSpecialTransferModal(${user.level},'${escapeHtml(user.name)}')">
                           <i class="fas fa-plus" style="font-size:0.7rem;"></i> Assign
                       </button>`)}
        </div>
        ${childrenHtml}`;
    }

    // ─── Buy Vouchers flow (mirrors BuyVoucherScreen.tsx) ────────────────────
    window.openBuyVouchersPanel = function () {
        const panel = document.getElementById('buyVouchersPanel');
        if (!panel) return;
        panel.style.display = 'flex';
        state.buyQuantity = 5;
        state.buyTimer    = 3600;
        updateBuyUI();
        startBuyTimer();
    };

    window.closeBuyVouchersPanel = function () {
        const panel = document.getElementById('buyVouchersPanel');
        if (panel) panel.style.display = 'none';
        clearInterval(state.buyTimerInterval);
    };

    function changeBuyQty(delta) {
        const newQty = state.buyQuantity + delta;
        if (newQty >= 5 && newQty % 5 === 0) { state.buyQuantity = newQty; updateBuyUI(); }
    }

    function updateBuyUI() {
        const qty      = state.buyQuantity;
        const sets     = Math.floor(qty / 5);
        const actual   = sets * 6000;
        const discounted = sets * 3600;
        const savings  = actual - discounted;
        set('buyQtyDisplay',   qty);
        set('buyOriginalPrice', '₹' + actual.toLocaleString('en-IN'));
        set('buyDiscount',     '-₹' + savings.toLocaleString('en-IN'));
        set('buyTotal',        '₹' + discounted.toLocaleString('en-IN'));
        set('buySavings',      'You save ₹' + savings.toLocaleString('en-IN') + '!');
        set('buyBtnLabel',     'Pay ₹' + discounted.toLocaleString('en-IN') + ' via Payment Gateway');
        const minusBtn = document.getElementById('buyQtyMinus');
        if (minusBtn) minusBtn.disabled = qty <= 5;
    }

    function startBuyTimer() {
        clearInterval(state.buyTimerInterval);
        state.buyTimerInterval = setInterval(() => {
            state.buyTimer = Math.max(0, state.buyTimer - 1);
            set('buyTimerDisplay', formatTimer(state.buyTimer));
            if (state.buyTimer <= 0) {
                clearInterval(state.buyTimerInterval);
                showToast('Purchase window expired. Please try again.', 'error');
                closeBuyVouchersPanel();
            }
        }, 1000);
        set('buyTimerDisplay', formatTimer(state.buyTimer));
    }

    async function handleBuyNow() {
        const qty   = state.buyQuantity;
        const sets  = Math.floor(qty / 5);
        const total = sets * 3600;
        if (!confirm(`Confirm purchase of ${qty} vouchers for ₹${total.toLocaleString('en-IN')}?`)) return;
        const btn = document.getElementById('confirmBuyBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing…'; }
        try {
            const res = await apiFetch('/mlm/vouchers/purchase', 'POST', { quantity: qty, totalAmount: total, paymentMethod: 'razorpay' });
            if (res?.success) {
                showToast(`Successfully purchased ${qty} vouchers!`, 'success');
                closeBuyVouchersPanel();
                loadDashboard();
            } else showToast(res?.message || 'Purchase failed', 'error');
        } catch { showToast('Purchase failed. Please try again.', 'error'); }
        finally { if (btn) { btn.disabled = false; set('buyBtnLabel', 'Pay ₹' + (sets * 3600).toLocaleString('en-IN') + ' via Payment Gateway'); } }
    }

    // ─── Transfer Credits Modal (mirrors TransferCreditsModal.tsx) ────────────
    window.openTransferCreditsModal = function (buyerId, buyerName, buyerPhone) {
        state.selectedBuyerId   = buyerId;
        state.selectedBuyerName = buyerName;
        set('tcRecipientName',    buyerName);
        set('tcRecipientPhone',   buyerPhone);
        set('tcAvailableCredits', fmtNum(state.metrics.availableCredits || 0) + ' credits');
        const tcAmount = document.getElementById('tcAmount');
        if (tcAmount) tcAmount.value = '1';
        document.getElementById('tcError')?.classList.add('d-none');
        new bootstrap.Modal(document.getElementById('transferCreditsModal')).show();
    };

    async function handleTransferCreditsConfirm() {
        const amount   = parseInt(document.getElementById('tcAmount')?.value) || 1;
        const errorDiv = document.getElementById('tcError');
        if (amount < 1 || amount > 5) {
            if (errorDiv) { errorDiv.textContent = 'Amount must be between 1 and 5 credits'; errorDiv.classList.remove('d-none'); }
            return;
        }
        const btn = document.getElementById('confirmTransferCreditsBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Transferring…'; }
        try {
            const res = await apiFetch('/mlm/credits/transfer', 'POST', { receiverId: state.selectedBuyerId, amount, note: 'Transfer from website' });
            if (res?.success) {
                bootstrap.Modal.getInstance(document.getElementById('transferCreditsModal'))?.hide();
                showToast(`Credits transferred to ${state.selectedBuyerName}!`, 'success');
                loadDashboard();
            } else {
                if (errorDiv) { errorDiv.textContent = res?.message || 'Transfer failed'; errorDiv.classList.remove('d-none'); }
            }
        } catch { if (errorDiv) { errorDiv.textContent = 'Transfer failed. Please try again.'; errorDiv.classList.remove('d-none'); } }
        finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-coins me-1"></i>Transfer Credits'; } }
    }

    // ─── Transfer Voucher (mirrors VoucherTransferModal.tsx) ─────────────────
    window.openTransferVoucherToBuyer = function (buyerId, buyerName, buyerPhone) {
        if (state.isVoucherAdmin) {
            openAdminVoucherTransferModal(buyerPhone, buyerName);
        } else {
            const unredeemed = state.vouchers.find(v =>
                v.redeemedStatus === 'unredeemed' && !v.isSpecialCreditsVoucher && v._id !== 'instantlly-special-credits');
            if (!unredeemed) { showToast('No available vouchers to transfer', 'error'); return; }
            openVoucherTransferModal(unredeemed, buyerPhone);
        }
    };

    function openVoucherTransferModal(voucher, prefillPhone) {
        document.getElementById('transferVoucherNumber').value = voucher.voucherNumber || 'Voucher';
        document.getElementById('recipientPhone').value = prefillPhone || '';
        document.getElementById('transferQty').value = '1';
        document.getElementById('transferError')?.classList.add('d-none');
        const btn = document.getElementById('confirmTransferBtn');
        btn.dataset.voucherId = voucher._id;
        btn.dataset.isAdmin   = 'false';
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    }

    window.openAdminVoucherTransferModal = function (prefillPhone, prefillName) {
        document.getElementById('transferVoucherNumber').value = 'ADMIN-TRANSFER';
        document.getElementById('recipientPhone').value = prefillPhone || '';
        document.getElementById('transferQty').value = '1';
        document.getElementById('transferError')?.classList.add('d-none');
        const btn = document.getElementById('confirmTransferBtn');
        btn.dataset.voucherId = 'admin-voucher-transfer';
        btn.dataset.isAdmin   = 'true';
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    };

    window.openSpecialTransferModal = function (slotNumber, slotName) {
        document.getElementById('transferVoucherNumber').value = `Slot ${slotNumber} — ${slotName}`;
        document.getElementById('recipientPhone').value = '';
        document.getElementById('transferQty').value = '1';
        document.getElementById('transferError')?.classList.add('d-none');
        const btn = document.getElementById('confirmTransferBtn');
        btn.dataset.voucherId = 'admin-voucher-transfer';
        btn.dataset.isAdmin   = 'true';
        new bootstrap.Modal(document.getElementById('transferModal')).show();
    };

    async function handleTransferVoucherConfirm() {
        const voucherId      = this.dataset.voucherId;
        const isAdmin        = this.dataset.isAdmin === 'true';
        const recipientPhone = document.getElementById('recipientPhone').value.trim();
        const qty            = parseInt(document.getElementById('transferQty')?.value || '1');
        const errorDiv       = document.getElementById('transferError');
        if (!recipientPhone) {
            if (errorDiv) { errorDiv.textContent = 'Please enter recipient phone number'; errorDiv.classList.remove('d-none'); }
            return;
        }
        this.disabled  = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Transferring…';
        try {
            const endpoint = (isAdmin || voucherId === 'admin-voucher-transfer') ? '/mlm/vouchers/admin-transfer' : `/mlm/vouchers/${voucherId}/transfer`;
            const res = await apiFetch(endpoint, 'POST', { recipientPhone, quantity: qty });
            if (res?.success) {
                bootstrap.Modal.getInstance(document.getElementById('transferModal'))?.hide();
                showToast('Voucher transferred successfully!', 'success');
                loadDashboard();
            } else {
                if (errorDiv) { errorDiv.textContent = res?.message || 'Transfer failed'; errorDiv.classList.remove('d-none'); }
            }
        } catch { if (errorDiv) { errorDiv.textContent = 'Transfer failed. Please try again.'; errorDiv.classList.remove('d-none'); } }
        finally { this.disabled = false; this.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Transfer'; }
    }

    // ─── Redeem Voucher ───────────────────────────────────────────────────────
    async function handleRedeem(voucherId) {
        if (!confirm('Redeem this voucher?')) return;
        try {
            const res = await apiFetch(`/mlm/vouchers/${voucherId}/redeem`, 'POST');
            if (res?.success) { showToast(res.message || 'Voucher redeemed!', 'success'); loadDashboard(); }
            else showToast(res?.message || 'Redemption failed', 'error');
        } catch { showToast('Redemption failed. Please try again.', 'error'); }
    }

    // ─── Voucher Detail Modal ─────────────────────────────────────────────────
    function openDetailModal(voucher) {
        const content  = document.getElementById('voucherDetailContent');
        const status   = getVoucherStatus(voucher);
        const sPill    = status === 'Active' ? 'status-unredeemed' : status === 'Redeemed' ? 'status-redeemed' : 'status-expired';
        const dispAmt  = voucher.amount || voucher.MRP || 1200;
        const discPct  = voucher.discountPercentage || 0;
        const mrp      = voucher.MRP || 0;
        const row = (label, val) => `<div style="margin-bottom:1rem;">
            <div style="font-size:0.72rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">${label}</div>
            <div style="font-size:0.95rem;font-weight:600;color:#111;">${val}</div></div>`;

        content.innerHTML = `
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-bottom:3px;">${escapeHtml(voucher.companyName || 'Instantlly')}</div>
                        <div style="font-family:'Courier New',monospace;font-size:1.1rem;font-weight:700;color:#fff;">#${escapeHtml(voucher.voucherNumber)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.9rem;font-weight:800;color:#fff;line-height:1;">₹${Number(dispAmt).toLocaleString('en-IN')}</div>
                        ${discPct > 0 ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.8);">${discPct}% OFF · MRP ₹${Number(mrp).toLocaleString('en-IN')}</div>` : ''}
                    </div>
                </div>
                <div style="margin-top:0.75rem;">
                    <span class="voucher-status-pill ${sPill}">${status}</span>
                    <span class="source-tag source-${voucher.source || 'purchase'}" style="margin-left:0.5rem;">${voucher.source || 'purchase'}</span>
                </div>
            </div>
            <div class="row">
                <div class="col-6">${row('Issue Date', formatDate(voucher.issueDate))}</div>
                <div class="col-6">${row('Expiry Date', formatDate(voucher.expiryDate))}</div>
                ${voucher.redeemedAt ? `<div class="col-6">${row('Redeemed On', formatDate(voucher.redeemedAt))}</div>` : ''}
                <div class="col-6">${row('Source', `<i class="fas ${getSourceIcon(voucher.source)} me-1"></i>${voucher.source || 'N/A'}`)}</div>
            </div>
            ${voucher.description ? `<div style="background:#f9fafb;border-radius:10px;padding:1rem;margin-top:0.5rem;">
                <div style="font-size:0.72rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px;">Description</div>
                <div style="font-size:0.9rem;color:#374151;">${escapeHtml(voucher.description)}</div>
            </div>` : ''}
            ${voucher.transferHistory?.length > 0 ? `<div style="margin-top:1.25rem;">
                <div style="font-size:0.78rem;font-weight:700;color:#374151;margin-bottom:0.75rem;"><i class="fas fa-history me-1" style="color:#4f46e5;"></i> Transfer History</div>
                ${voucher.transferHistory.map(t => `<div style="background:#f9fafb;border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:0.85rem;">
                        <strong>${escapeHtml(typeof t.from === 'object' ? t.from.name || 'Unknown' : 'Unknown')}</strong>
                        <span style="color:#4f46e5;font-weight:700;margin:0 0.4rem;">→</span>
                        <strong>${escapeHtml(typeof t.to === 'object' ? t.to.name || 'Unknown' : 'Unknown')}</strong>
                    </div>
                    <small style="color:#9ca3af;">${formatDate(t.transferredAt)}</small>
                </div>`).join('')}
            </div>` : ''}`;
        new bootstrap.Modal(document.getElementById('voucherDetailModal')).show();
    }

    // ─── Toggle transfer history accordion ───────────────────────────────────
    window.toggleTransferHistory = function () {
        const btn  = document.getElementById('thToggleBtn');
        const list = document.getElementById('transferHistoryList');
        if (!btn || !list) return;
        btn.classList.toggle('open');
        list.classList.toggle('open');
    };

    // ─── Tab switcher ──────────────────────────────────────────────────────────
    window.switchTab = function (name, btn) {
        document.querySelectorAll('.vtab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.vtab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('pane-' + name)?.classList.add('active');
    };

    // ─── Helpers ──────────────────────────────────────────────────────────────
    async function apiFetch(path, method = 'GET', body = null) {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const opts  = { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${API_BASE_URL}${path}`, opts);
        if (res.status === 401) { localStorage.removeItem(AUTH_TOKEN_KEY); window.location.href = 'voucher-login.html'; return null; }
        return res.json();
    }

    function getVal(settled) { return settled.status === 'fulfilled' ? settled.value : null; }

    function getVoucherStatus(v) {
        if (v.redeemedStatus === 'redeemed') return 'Redeemed';
        if (v.redeemedStatus === 'expired' || new Date(v.expiryDate) < new Date()) return 'Expired';
        return 'Active';
    }

    function getTransferInfo(voucher, listType) {
        if (listType === 'received' && voucher.transferredFrom) {
            const n = voucher.transferredFrom.name || 'Unknown', p = voucher.transferredFrom.phone || '';
            return `Received from ${n}${p ? ` (${p})` : ''}`;
        }
        if (listType === 'sent' && voucher.transferHistory?.length > 0) {
            const last = voucher.transferHistory[voucher.transferHistory.length - 1];
            if (last.to) {
                const n = typeof last.to === 'object' ? last.to.name || 'Unknown' : 'Unknown';
                const p = typeof last.to === 'object' ? last.to.phone || '' : '';
                return `Sent to ${n}${p ? ` (${p})` : ''}`;
            }
        }
        return null;
    }

    function getSourceIcon(source) {
        return { purchase: 'fa-shopping-cart', transfer: 'fa-gift', admin: 'fa-user-shield' }[source] || 'fa-ticket-alt';
    }

    function set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

    function fmtNum(n) {
        if (n === undefined || n === null) return '0';
        n = Number(n);
        if (n >= 10000000) return (n / 10000000).toFixed(2) + 'Cr';
        if (n >= 100000)   return (n / 100000).toFixed(2) + 'L';
        if (n >= 1000)     return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString('en-IN');
    }

    function fmtCreditsAmt(n) {
        if (!n) return '0';
        n = Number(n);
        if (n >= 10000000) return (n / 10000000).toFixed(2) + ' Cr';
        if (n >= 100000)   return (n / 100000).toFixed(2) + ' Lacs';
        if (n >= 1000)     return (n / 1000).toFixed(1) + 'K';
        return n.toLocaleString('en-IN');
    }

    function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    function formatCountdown(target) {
        if (!target) return '--';
        const diff = new Date(target).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
    }
    function formatTimer(s) { return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(msg, type = 'success') {
        const t = document.getElementById('toastBar');
        if (!t) return;
        t.textContent = msg;
        t.className = `toast-bar ${type} show`;
        setTimeout(() => t.classList.remove('show'), 3500);
    }

    // Expose globals
    window.logout         = () => { localStorage.removeItem(AUTH_TOKEN_KEY); window.location.href = 'voucher-login.html'; };
    window.goToPromotions = () => { window.location.href = 'promotions.html'; };

})();
