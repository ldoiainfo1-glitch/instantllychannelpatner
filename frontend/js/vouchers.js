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
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                    <p class="empty-state-text">No ${type} vouchers found</p>
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
        const statusClass = `status-${status.toLowerCase()}`;
        const displayAmount = voucher.amount || voucher.MRP || 1200;
        const discountPercent = voucher.discountPercentage || 40;
        const mrp = voucher.MRP || 6000;

        const canTransfer = voucher.redeemedStatus === 'unredeemed' && 
                          new Date(voucher.expiryDate) > new Date() &&
                          listType !== 'sent';

        const transferInfo = getTransferInfo(voucher, listType);

        return `
            <div class="voucher-card">
                <div class="voucher-header-section">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="voucher-number">${escapeHtml(voucher.voucherNumber)}</div>
                            <div style="font-size: 0.875rem; opacity: 0.9; margin-top: 0.5rem;">
                                ${escapeHtml(voucher.companyName || 'Instantlly')}
                            </div>
                        </div>
                        <span class="voucher-status-badge ${statusClass}">
                            ${status}
                        </span>
                    </div>
                </div>
                <div class="voucher-body">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <div class="voucher-detail-label">Voucher Amount</div>
                            <div class="voucher-amount">₹${displayAmount.toLocaleString()}</div>
                            ${discountPercent > 0 ? `
                                <div style="font-size: 0.875rem; color: #10b981; font-weight: 600;">
                                    ${discountPercent}% OFF (MRP: ₹${mrp.toLocaleString()})
                                </div>
                            ` : ''}
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="voucher-detail-label">Expiry Date</div>
                            <div class="voucher-detail-value">
                                ${formatDate(voucher.expiryDate)}
                            </div>
                        </div>
                    </div>

                    ${transferInfo ? `
                        <div class="alert alert-info mb-3" style="font-size: 0.875rem;">
                            <i class="fas fa-info-circle me-1"></i> ${escapeHtml(transferInfo)}
                        </div>
                    ` : ''}

                    ${voucher.description ? `
                        <div class="mb-3">
                            <div class="voucher-detail-label">Description</div>
                            <div class="voucher-detail-value" style="font-size: 0.875rem;">
                                ${escapeHtml(voucher.description)}
                            </div>
                        </div>
                    ` : ''}

                    <div class="row mb-3">
                        <div class="col-md-4">
                            <div class="voucher-detail-label">Issue Date</div>
                            <div class="voucher-detail-value" style="font-size: 0.875rem;">
                                ${formatDate(voucher.issueDate)}
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="voucher-detail-label">Source</div>
                            <div class="voucher-detail-value" style="font-size: 0.875rem; text-transform: capitalize;">
                                <i class="fas ${getSourceIcon(voucher.source)} me-1"></i>
                                ${voucher.source}
                            </div>
                        </div>
                        ${voucher.redeemedAt ? `
                            <div class="col-md-4">
                                <div class="voucher-detail-label">Redeemed At</div>
                                <div class="voucher-detail-value" style="font-size: 0.875rem;">
                                    ${formatDate(voucher.redeemedAt)}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill" id="detail-${voucher._id}">
                            <i class="fas fa-eye me-1"></i>View Details
                        </button>
                        ${canTransfer ? `
                            <button class="btn btn-sm btn-transfer flex-fill" id="transfer-${voucher._id}">
                                <i class="fas fa-paper-plane me-1"></i>Transfer
                            </button>
                        ` : ''}
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
        this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Transferring...';

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
            this.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Transfer Voucher';
        }
    }

    // Open Detail Modal
    function openDetailModal(voucher) {
        const content = document.getElementById('voucherDetailContent');
        const status = getVoucherStatus(voucher);
        const statusClass = `status-${status.toLowerCase()}`;
        
        content.innerHTML = `
            <div class="voucher-header-section mb-4">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="voucher-number">${escapeHtml(voucher.voucherNumber)}</div>
                        <div style="font-size: 1rem; opacity: 0.9; margin-top: 0.5rem;">
                            ${escapeHtml(voucher.companyName || 'Instantlly')}
                        </div>
                    </div>
                    <span class="voucher-status-badge ${statusClass}">
                        ${status}
                    </span>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="voucher-detail-label">Voucher Amount</div>
                    <div class="voucher-amount">₹${(voucher.amount || voucher.MRP || 1200).toLocaleString()}</div>
                    ${voucher.discountPercentage ? `
                        <div style="font-size: 0.875rem; color: #10b981; font-weight: 600;">
                            ${voucher.discountPercentage}% OFF (MRP: ₹${(voucher.MRP || 6000).toLocaleString()})
                        </div>
                    ` : ''}
                </div>
                <div class="col-md-6">
                    <div class="voucher-detail-label">Validity</div>
                    <div class="voucher-detail-value">
                        ${escapeHtml(voucher.validity || `Valid till ${formatDate(voucher.expiryDate)}`)}
                    </div>
                </div>
            </div>

            ${voucher.description ? `
                <div class="mb-4">
                    <div class="voucher-detail-label">Description</div>
                    <div class="voucher-detail-value">${escapeHtml(voucher.description)}</div>
                </div>
            ` : ''}

            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="voucher-detail-label">Issue Date</div>
                    <div class="voucher-detail-value">${formatDate(voucher.issueDate)}</div>
                </div>
                <div class="col-md-4">
                    <div class="voucher-detail-label">Expiry Date</div>
                    <div class="voucher-detail-value">${formatDate(voucher.expiryDate)}</div>
                </div>
                <div class="col-md-4">
                    <div class="voucher-detail-label">Source</div>
                    <div class="voucher-detail-value" style="text-transform: capitalize;">
                        <i class="fas ${getSourceIcon(voucher.source)} me-1"></i>
                        ${voucher.source}
                    </div>
                </div>
            </div>

            ${voucher.transferHistory && voucher.transferHistory.length > 0 ? `
                <div class="mb-4">
                    <div class="voucher-detail-label mb-2">Transfer History</div>
                    ${voucher.transferHistory.map(transfer => `
                        <div class="transfer-history-item">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <strong>${escapeHtml(typeof transfer.from === 'object' ? transfer.from.name : 'Unknown')}</strong>
                                    <span class="transfer-arrow">→</span>
                                    <strong>${escapeHtml(typeof transfer.to === 'object' ? transfer.to.name : 'Unknown')}</strong>
                                </div>
                                <small class="text-muted">${formatDate(transfer.transferredAt)}</small>
                            </div>
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
                    <div class="loading-spinner">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                `;
            }
        });
    }

    // Hide Loading
    function hideLoading() {
        // Loading is hidden when content is rendered
    }

    // Show Error
    function showError(message) {
        alert('Error: ' + message);
    }

    // Show Success
    function showSuccess(message) {
        alert('Success: ' + message);
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
