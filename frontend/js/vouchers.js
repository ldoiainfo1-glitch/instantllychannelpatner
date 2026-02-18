// Vouchers Management for Channel Partner
(function() {
    'use strict';

    // Configuration - Uses same backend as InstantllyCards app
    const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://api.instantllycards.com/api';

    const AUTH_TOKEN_KEY = 'authToken';

    // State
    let vouchersData = {
        all: [],
        purchased: [],
        received: [],
        sent: []
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        checkAuth();
        initializeEventListeners();
        loadVouchers();
    });

    // Check Authentication
    function checkAuth() {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            // Redirect to voucher login page
            window.location.href = 'voucher-login.html';
            return;
        }
    }

    // Initialize Event Listeners
    function initializeEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshVouchersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => loadVouchers());
        }

        // Transfer modal confirm
        const confirmTransferBtn = document.getElementById('confirmTransferBtn');
        if (confirmTransferBtn) {
            confirmTransferBtn.addEventListener('click', handleTransferConfirm);
        }
    }

    // Load Vouchers
    async function loadVouchers() {
        try {
            showLoading();
            const token = localStorage.getItem(AUTH_TOKEN_KEY);

            if (!token) {
                showError('Please log in to view vouchers.');
                setTimeout(() => {
                    window.location.href = 'voucher-login.html';
                }, 1500);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/mlm/vouchers/history?limit=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showError('Session expired. Please log in again.');
                    setTimeout(() => {
                        localStorage.removeItem(AUTH_TOKEN_KEY);
                        window.location.href = 'voucher-login.html';
                    }, 1500);
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                updateVouchersData(data.history);
                renderVouchers();
                updateStatistics(data.history);
            } else {
                showError('Failed to load vouchers: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading vouchers:', error);
            showError('Error loading vouchers. Please check your connection and try again.');
        } finally {
            hideLoading();
        }
    }

    // Update Vouchers Data
    function updateVouchersData(history) {
        vouchersData.all = history.all || [];
        
        // Filter purchased vouchers
        vouchersData.purchased = vouchersData.all.filter(v => 
            v.source === 'purchase'
        );
        
        // Filter received vouchers
        vouchersData.received = vouchersData.all.filter(v => 
            v.source === 'transfer' && !isSentVoucher(v)
        );
        
        // Filter sent vouchers
        vouchersData.sent = vouchersData.all.filter(v => 
            isSentVoucher(v)
        );
    }

    // Check if voucher was sent by current user
    function isSentVoucher(voucher) {
        if (!voucher.transferHistory || voucher.transferHistory.length === 0) {
            return false;
        }
        
        return voucher.transferHistory.some(t => {
            const fromId = typeof t.from === 'object' ? t.from._id : t.from;
            return fromId && voucher.originalOwner && 
                   fromId.toString() === voucher.originalOwner._id?.toString();
        });
    }

    // Update Statistics
    function updateStatistics(history) {
        const totalCount = history.all?.length || 0;
        const purchasedCount = history.purchased || 0;
        const receivedCount = history.received || 0;
        const sentCount = history.sent || 0;

        // Update stat cards
        document.getElementById('totalVouchersCount').textContent = totalCount;
        document.getElementById('purchasedCount').textContent = purchasedCount;
        document.getElementById('receivedCount').textContent = receivedCount;
        document.getElementById('sentCount').textContent = sentCount;

        // Update badges
        document.getElementById('allBadge').textContent = totalCount;
        document.getElementById('purchasedBadge').textContent = purchasedCount;
        document.getElementById('receivedBadge').textContent = receivedCount;
        document.getElementById('sentBadge').textContent = sentCount;
    }

    // Render Vouchers
    function renderVouchers() {
        renderVoucherList('all', vouchersData.all);
        renderVoucherList('purchased', vouchersData.purchased);
        renderVoucherList('received', vouchersData.received);
        renderVoucherList('sent', vouchersData.sent);
    }

    // Render Voucher List
    function renderVoucherList(type, vouchers) {
        const container = document.getElementById(`${type}VouchersList`);
        if (!container) return;
        
        if (!vouchers || vouchers.length === 0) {
            const labels = { all: 'All', purchased: 'Purchased', received: 'Received', sent: 'Sent' };
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon-wrap"><i class="fas fa-ticket-alt"></i></div>
                    <div class="empty-title">No ${labels[type] || type} vouchers yet</div>
                    <div class="empty-sub">Your ${type} vouchers will appear here once available</div>
                </div>
            `;
            return;
        }

        container.innerHTML = vouchers.map(voucher => createVoucherCard(voucher, type)).join('');

        // Add event listeners for actions
        vouchers.forEach(voucher => {
            const transferBtn = document.getElementById(`transfer-${voucher._id}`);
            const detailBtn = document.getElementById(`detail-${voucher._id}`);

            if (transferBtn) {
                transferBtn.addEventListener('click', () => openTransferModal(voucher));
            }

            if (detailBtn) {
                detailBtn.addEventListener('click', () => openDetailModal(voucher));
            }
        });
    }

    // Create Voucher Card
    function createVoucherCard(voucher, listType) {
        const status = getVoucherStatus(voucher);
        const statusPill = status === 'Active' ? 'status-unredeemed' :
                           status === 'Redeemed' ? 'status-redeemed' : 'status-expired';
        const displayAmount = voucher.amount || voucher.MRP || 1200;
        const discountPercent = voucher.discountPercentage || 0;
        const mrp = voucher.MRP || 0;
        const sourceClass = `source-${voucher.source || 'purchase'}`;
        const sourceLabel = voucher.source ? (voucher.source.charAt(0).toUpperCase() + voucher.source.slice(1)) : 'Purchase';

        const canTransfer = voucher.redeemedStatus === 'unredeemed' &&
                            new Date(voucher.expiryDate) > new Date() &&
                            listType !== 'sent';
        const canRedeem = voucher.redeemedStatus === 'unredeemed' &&
                          new Date(voucher.expiryDate) > new Date();

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
                        <div class="voucher-amount-value">₹${Number(displayAmount).toLocaleString('en-IN')}</div>
                        <div class="voucher-amount-label">${discountPercent > 0 ? `MRP ₹${Number(mrp).toLocaleString('en-IN')}` : 'Value'}</div>
                    </div>
                    ${discountPercent > 0 ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
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
                        <button class="btn-redeem" ${canRedeem ? '' : 'disabled'}>${status === 'Redeemed' ? 'Redeemed' : status === 'Expired' ? 'Expired' : 'Redeem →'}</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Get Voucher Status
    function getVoucherStatus(voucher) {
        if (voucher.redeemedStatus === 'redeemed') return 'Redeemed';
        if (voucher.redeemedStatus === 'expired' || new Date(voucher.expiryDate) < new Date()) return 'Expired';
        return 'Active';
    }

    // Get Source Icon
    function getSourceIcon(source) {
        switch(source) {
            case 'purchase': return 'fa-shopping-cart';
            case 'transfer': return 'fa-gift';
            case 'admin': return 'fa-user-shield';
            default: return 'fa-ticket-alt';
        }
    }

    // Get Transfer Info
    function getTransferInfo(voucher, listType) {
        if (listType === 'received' && voucher.transferredFrom) {
            const fromName = voucher.transferredFrom.name || 'Unknown';
            const fromPhone = voucher.transferredFrom.phone || '';
            return `Received from ${fromName} ${fromPhone ? `(${fromPhone})` : ''}`;
        }

        if (listType === 'sent' && voucher.transferHistory && voucher.transferHistory.length > 0) {
            const lastTransfer = voucher.transferHistory[voucher.transferHistory.length - 1];
            if (lastTransfer.to) {
                const toName = typeof lastTransfer.to === 'object' ? lastTransfer.to.name : 'Unknown';
                const toPhone = typeof lastTransfer.to === 'object' ? lastTransfer.to.phone : '';
                return `Sent to ${toName} ${toPhone ? `(${toPhone})` : ''}`;
            }
        }

        return null;
    }

    // Format Date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // Open Transfer Modal
    function openTransferModal(voucher) {
        document.getElementById('transferVoucherNumber').value = voucher.voucherNumber;
        document.getElementById('recipientPhone').value = '';
        document.getElementById('transferError').classList.add('d-none');
        
        document.getElementById('confirmTransferBtn').dataset.voucherId = voucher._id;
        
        const modal = new bootstrap.Modal(document.getElementById('transferModal'));
        modal.show();
    }

    // Handle Transfer Confirm
    async function handleTransferConfirm() {
        const voucherId = this.dataset.voucherId;
        const recipientPhone = document.getElementById('recipientPhone').value.trim();
        const errorDiv = document.getElementById('transferError');

        if (!recipientPhone) {
            errorDiv.textContent = 'Please enter recipient phone number';
            errorDiv.classList.remove('d-none');
            return;
        }

        this.disabled = true;
this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Transferring…';

        try {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const response = await fetch(`${API_BASE_URL}/mlm/vouchers/${voucherId}/transfer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recipientPhone })
            });

            const data = await response.json();

            if (data.success) {
                bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
                showSuccess(`Voucher transferred successfully to ${recipientPhone}`);
                await loadVouchers();
            } else {
                errorDiv.textContent = data.message || 'Transfer failed';
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Transfer error:', error);
            errorDiv.textContent = 'Error transferring voucher. Please try again.';
            errorDiv.classList.remove('d-none');
        } finally {
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Transfer';
        }
    }

    // Open Detail Modal
    function openDetailModal(voucher) {
        const content = document.getElementById('voucherDetailContent');
        const status = getVoucherStatus(voucher);
        const statusPill = status === 'Active' ? 'status-unredeemed' :
                           status === 'Redeemed' ? 'status-redeemed' : 'status-expired';
        const displayAmount = voucher.amount || voucher.MRP || 1200;
        const discountPercent = voucher.discountPercentage || 0;
        const mrp = voucher.MRP || 0;

        const row = (label, value) => `
            <div style="margin-bottom:1rem;">
                <div style="font-size:0.72rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">${label}</div>
                <div style="font-size:0.95rem;font-weight:600;color:#111;">${value}</div>
            </div>
        `;

        content.innerHTML = `
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;position:relative;overflow:hidden;">
                <div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 50%,rgba(255,255,255,0.12),transparent);pointer-events:none;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-bottom:3px;">${escapeHtml(voucher.companyName || 'Instantlly')}</div>
                        <div style="font-family:'Courier New',monospace;font-size:1.1rem;font-weight:700;color:#fff;">#${escapeHtml(voucher.voucherNumber)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.9rem;font-weight:800;color:#fff;line-height:1;">₹${Number(displayAmount).toLocaleString('en-IN')}</div>
                        ${discountPercent > 0 ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.8);">${discountPercent}% OFF · MRP ₹${Number(mrp).toLocaleString('en-IN')}</div>` : ''}
                    </div>
                </div>
                <div style="margin-top:0.75rem;">
                    <span class="voucher-status-pill ${statusPill}">${status}</span>
                    <span class="source-tag source-${voucher.source || 'purchase'}" style="margin-left:0.5rem;">${voucher.source || 'purchase'}</span>
                </div>
            </div>

            <div class="row">
                <div class="col-6">${row('Issue Date', formatDate(voucher.issueDate))}</div>
                <div class="col-6">${row('Expiry Date', formatDate(voucher.expiryDate))}</div>
                ${voucher.redeemedAt ? `<div class="col-6">${row('Redeemed On', formatDate(voucher.redeemedAt))}</div>` : ''}
                <div class="col-6">${row('Source', `<i class="fas ${getSourceIcon(voucher.source)} me-1" style="font-size:0.85rem;"></i>${voucher.source || 'N/A'}`)}</div>
            </div>

            ${voucher.description ? `
                <div style="background:#f9fafb;border-radius:10px;padding:1rem;margin-top:0.5rem;">
                    <div style="font-size:0.72rem;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px;">Description</div>
                    <div style="font-size:0.9rem;color:#374151;">${escapeHtml(voucher.description)}</div>
                </div>
            ` : ''}

            ${voucher.transferHistory && voucher.transferHistory.length > 0 ? `
                <div style="margin-top:1.25rem;">
                    <div style="font-size:0.78rem;font-weight:700;color:#374151;margin-bottom:0.75rem;"><i class="fas fa-history me-1" style="color:#4f46e5;"></i> Transfer History</div>
                    ${voucher.transferHistory.map(t => `
                        <div style="background:#f9fafb;border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">
                            <div style="font-size:0.85rem;">
                                <strong>${escapeHtml(typeof t.from === 'object' ? t.from.name || 'Unknown' : 'Unknown')}</strong>
                                <span style="color:#4f46e5;font-weight:700;margin:0 0.4rem;">→</span>
                                <strong>${escapeHtml(typeof t.to === 'object' ? t.to.name || 'Unknown' : 'Unknown')}</strong>
                            </div>
                            <small style="color:#9ca3af;">${formatDate(t.transferredAt)}</small>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;

        const modal = new bootstrap.Modal(document.getElementById('voucherDetailModal'));
        modal.show();
    }

    // Show Loading
    function showLoading() {
        ['all', 'purchased', 'received', 'sent'].forEach(type => {
            const container = document.getElementById(`${type}VouchersList`);
            if (container) {
                container.innerHTML = `
                    <div class="loading-overlay">
                        <div class="spinner-ring"></div>
                        <div style="font-size:0.9rem;color:#9ca3af;font-weight:500;">Loading vouchers…</div>
                    </div>
                `;
            }
        });
    }

    // Hide Loading
    function hideLoading() {
        // Content render replaces the loading overlay automatically
    }

    // Show Error
    function showError(message) {
        if (window.showToast) { window.showToast(message, 'error'); }
        else { console.error(message); }
    }

    // Show Success
    function showSuccess(message) {
        if (window.showToast) { window.showToast(message, 'success'); }
        else { console.log(message); }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper functions from profile page
    window.logout = function() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = 'login.html';
    };

    window.goToPromotions = function() {
        window.location.href = 'promotion.html';
    };

})();
