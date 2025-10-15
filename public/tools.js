document.addEventListener('DOMContentLoaded', () => {
    // This key was provided in a previous turn for WhoisXMLAPI services.
    const apiKey = 'at_r3gmzX6h7BWhsRcLyMAYNZJ1uQqsa';

    // Get form elements
    const dnsForm = document.getElementById('dns-lookup-form');
    const whoisForm = document.getElementById('whois-lookup-form');
    const seoForm = document.getElementById('seo-checker-form');

    /**
     * Cleans user input to return a valid domain name.
     * Removes protocols, 'www.', and paths.
     * @param {string} input - The user's input string.
     * @returns {string} A sanitized domain name.
     */
    const sanitizeDomain = (input) => {
        if (!input) return '';
        let domain = input.trim().toLowerCase();
        domain = domain.replace(/^(https?:\/\/)?/i, '');
        domain = domain.replace(/^(www\.)?/i, '');
        domain = domain.split('/')[0];
        domain = domain.split('?')[0];
        return domain;
    };
    
    /**
     * Validates and returns a full URL.
     * @param {string} input - The user's input string.
     * @returns {string|null} A valid URL or null.
     */
    const getValidUrl = (input) => {
        if (!input) return null;
        let url = input.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        try {
            new URL(url);
            return url;
        } catch (_) {
            return null;
        }
    }

    const showLoading = (container, text = 'Fetching data...') => {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48">
                <svg class="h-10 w-10 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <p class="mt-4 text-blue-200">${sanitizeHTML(text)}</p>
            </div>
        `;
    };
    
    const renderError = (container, message) => {
        container.innerHTML = `<div class="text-center text-red-400 bg-red-500/10 p-4 rounded-lg">${sanitizeHTML(message)}</div>`;
    };
    
    const sanitizeHTML = (str) => {
        if (str === null || str === undefined) return '';
        const temp = document.createElement('div');
        temp.textContent = str.toString();
        return temp.innerHTML;
    };

    // --- DNS LOOKUP ---
    if (dnsForm) {
        dnsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(dnsForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            const url = `https://dns.google/resolve?name=${domain}&type=ANY`;
            showLoading(resultsContainer);
            try {
                const response = await fetch(url);
                const data = await response.json();
                renderGoogleDnsResults(resultsContainer, data);
            } catch (err) {
                renderError(resultsContainer, 'Failed to fetch DNS data.');
            }
        });
    }

    // --- WHOIS LOOKUP (ENHANCED with Hosting Info) ---
    if (whoisForm) {
        whoisForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(whoisForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            showLoading(resultsContainer);

            const whoisUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`;
            const hostingUrl = `https://ipinfo.io/${domain}/json`;

            const [whoisResponse, hostingResponse] = await Promise.allSettled([
                fetch(whoisUrl),
                fetch(hostingUrl)
            ]);

            let whoisData = null;
            let hostingData = null;
            let whoisError = null;

            if (whoisResponse.status === 'fulfilled' && whoisResponse.value.ok) {
                whoisData = await whoisResponse.value.json();
            } else {
                whoisError = 'Failed to fetch WHOIS data.';
            }

            if (hostingResponse.status === 'fulfilled' && hostingResponse.value.ok) {
                hostingData = await hostingResponse.value.json();
            }
            
            if (!whoisData && !hostingData) {
                return renderError(resultsContainer, whoisError || 'Could not fetch any data for this domain.');
            }

            renderWhoisAndHostingResults(resultsContainer, whoisData, hostingData);
        });
    }
    
    // --- SEO CHECKER ---
    if (seoForm) {
        seoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = getValidUrl(seoForm.querySelector('input').value);
            if (!url) {
                renderError(document.getElementById('results-container'), 'Please enter a valid URL (e.g., https://example.com)');
                return;
            }
            const resultsContainer = document.getElementById('results-container');
            showLoading(resultsContainer, 'Analyzing site... This may take a minute.');
            
            const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;
            
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
                }
                const data = await response.json();
                renderSeoResults(resultsContainer, data);
            } catch (error) {
                 const message = error instanceof Error ? error.message : 'An unknown network error occurred.';
                renderError(resultsContainer, `Could not analyze site: ${message}`);
            }
        });
    }
    
    const renderGoogleDnsResults = (container, data) => {
        const recordTypes = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 43: 'DS', 257: 'CAA' };
        if (!data || !data.Answer || data.Answer.length === 0) {
            return renderError(container, 'No DNS records found for this domain.');
        }
        let html = '<div class="space-y-4">';
        const recordsByType = data.Answer.reduce((acc, rec) => {
            const typeName = recordTypes[rec.type] || `Type ${rec.type}`;
            if (!acc[typeName]) {
                acc[typeName] = [];
            }
            acc[typeName].push(rec);
            return acc;
        }, {});

        for (const typeName in recordsByType) {
            html += `<h3 class="text-xl font-bold text-blue-200 mt-4 -mb-2">${typeName} Records</h3>`;
            recordsByType[typeName].forEach(rec => {
                 html += `
                    <div class="p-3 bg-white/10 rounded-lg">
                        <div class="flex justify-between items-center">
                          <strong class="text-blue-300 font-semibold">${sanitizeHTML(rec.name)}</strong>
                          <span class="text-xs text-blue-200/60">TTL: ${sanitizeHTML(rec.TTL)}</span>
                        </div>
                        <div class="pl-4 mt-1 text-blue-100/90 break-words">${sanitizeHTML(rec.data)}</div>
                    </div>
                `;
            });
        }

        html += '</div>';
        container.innerHTML = html;
    };

    const renderDataItem = (label, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return '';
        const displayValue = Array.isArray(value) ? value.join('<br>') : sanitizeHTML(value);
        return `
            <div class="flex flex-col sm:flex-row border-b border-white/10 py-2">
                <dt class="w-full sm:w-1/3 font-semibold text-blue-200/70">${sanitizeHTML(label)}:</dt>
                <dd class="w-full sm:w-2/3 text-blue-100 break-words">${displayValue}</dd> 
            </div>
        `;
    };

    const renderContactBlock = (title, contact) => {
        if (!contact) return '';
        const addressParts = [contact.street, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
        let html = `<h3 class="text-xl font-bold text-blue-200 mt-6 mb-2">${title}</h3><div class="space-y-0">`;
        html += renderDataItem('Name', contact.name);
        html += renderDataItem('Organization', contact.organization);
        if (addressParts.length > 0) {
            html += renderDataItem('Address', addressParts.join(', '));
        }
        html += renderDataItem('Phone', contact.telephone);
        html += renderDataItem('Email', contact.email);
        html += '</div>';
        return html;
    };

    const renderWhoisAndHostingResults = (container, whoisData, hostingData) => {
        const record = whoisData?.WhoisRecord;
        let html = '<div class="space-y-0">';

        if (record && record.createdDate) {
            html += '<h3 class="text-xl font-bold text-blue-200 mb-2">WHOIS Information</h3>';
            html += renderDataItem('Domain', record.domainName);
            html += renderDataItem('Registered On', record.createdDate ? new Date(record.createdDate).toUTCString() : 'N/A');
            html += renderDataItem('Expires On', record.expiresDate ? new Date(record.expiresDate).toUTCString() : 'N/A');
            html += renderDataItem('Updated On', record.updatedDate ? new Date(record.updatedDate).toUTCString() : 'N/A');
            html += renderDataItem('Status', record.status);
            html += renderDataItem('Name Servers', record.nameServers?.hostNames);
            
            html += '<h3 class="text-xl font-bold text-blue-200 mt-6 mb-2">Registrar Information</h3>';
            html += renderDataItem('Registrar', record.registrarName);
            html += renderDataItem('IANA ID', record.registrarIANAID);
            html += renderDataItem('Abuse Email', record.contactEmail);
            
            html += renderContactBlock('Registrant Contact', record.registrant);
            html += renderContactBlock('Administrative Contact', record.administrativeContact);
            html += renderContactBlock('Technical Contact', record.technicalContact);
        } else {
             html += '<h3 class="text-xl font-bold text-blue-200 mb-2">WHOIS Information</h3>';
             html += '<p class="text-blue-200/60">No WHOIS record found. The domain might be available.</p>';
        }

        if (hostingData && !hostingData.error) {
            html += '<h3 class="text-xl font-bold text-blue-200 mt-6 mb-2">Hosting Information</h3>';
            html += renderDataItem('IP Address', hostingData.ip);
            html += renderDataItem('Hosting Provider (ISP)', hostingData.org);
            html += renderDataItem('Hostname', hostingData.hostname);
            html += renderDataItem('Location', [hostingData.city, hostingData.region, hostingData.country].filter(Boolean).join(', '));
            html += renderDataItem('Timezone', hostingData.timezone);
        }

        html += '</div>';
        container.innerHTML = html;
    };
    
    const renderSeoResults = (container, data) => {
        const results = data.lighthouseResult;
        const categories = results.categories;
        const audits = results.audits;
        
        const screenshot = audits['final-screenshot']?.details?.data;

        const scoreCard = (title, score) => {
            const scoreNum = Math.round(score * 100);
            let colorClass = 'text-green-300';
            if (scoreNum < 90) colorClass = 'text-yellow-300';
            if (scoreNum < 50) colorClass = 'text-red-400';
            
            return `
                <div class="bg-white/10 p-4 rounded-lg text-center">
                    <div class="text-4xl font-bold ${colorClass}">${scoreNum}</div>
                    <div class="text-sm text-blue-200/80 mt-1">${title}</div>
                </div>
            `;
        };
        
        const auditCheckItem = (auditId, text) => {
            const audit = audits[auditId];
            if (!audit) return '';
            const pass = audit.score === 1;
            const icon = pass
              ? '<svg class="w-5 h-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>'
              : '<svg class="w-5 h-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>';
            
            return `<li class="flex items-center gap-3">${icon} <span class="text-blue-100/90">${text}</span></li>`;
        };

        let html = `
            <div class="space-y-6">
                ${screenshot ? `
                    <div>
                        <h2 class="text-2xl font-bold text-blue-200 mb-3 text-center">Homepage Screenshot</h2>
                        <img src="${screenshot}" alt="Website Screenshot" class="rounded-lg border-2 border-white/20 mx-auto shadow-lg" />
                    </div>
                ` : ''}

                <div>
                    <h2 class="text-2xl font-bold text-blue-200 mb-3 text-center">Core Web Vitals & SEO Scores</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${scoreCard('Performance', categories.performance.score)}
                        ${scoreCard('Accessibility', categories.accessibility.score)}
                        ${scoreCard('Best Practices', categories['best-practices'].score)}
                        ${scoreCard('SEO', categories.seo.score)}
                    </div>
                </div>
                
                <div>
                    <h2 class="text-2xl font-bold text-blue-200 mb-3 text-center">On-Page SEO Checklist</h2>
                    <div class="bg-white/10 p-4 rounded-lg">
                        <ul class="space-y-2">
                            ${auditCheckItem('document-title', 'Has a Title Tag')}
                            ${auditCheckItem('meta-description', 'Has a Meta Description')}
                            ${auditCheckItem('viewport', 'Is Mobile Friendly (Viewport Tag)')}
                            ${auditCheckItem('image-alt', 'All Images Have Alt Attributes')}
                            ${auditCheckItem('crawlable-links', 'Links are Crawlable')}
                            ${auditCheckItem('is-crawlable', 'Page is Crawlable (Not Blocked by robots.txt)')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    };
});