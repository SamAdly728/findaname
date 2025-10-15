document.addEventListener('DOMContentLoaded', () => {
    const apiKey = 'at_r3gmzX6h7BWhsRcLyMAYNZJ1uQqsa';

    const dnsForm = document.getElementById('dns-lookup-form');
    const whoisForm = document.getElementById('whois-lookup-form');
    const nsForm = document.getElementById('nameserver-lookup-form');
    const hostingForm = document.getElementById('hosting-lookup-form');
    const downForm = document.getElementById('website-down-form');

    /**
     * Cleans user input to return a valid domain name.
     * Removes protocols, 'www.', and paths.
     * @param {string} input - The user's input string.
     * @returns {string} A sanitized domain name.
     */
    const sanitizeDomain = (input) => {
        if (!input) return '';
        let domain = input.trim();
        // Remove protocol
        domain = domain.replace(/^(https?:\/\/)?/i, '');
        // Remove www.
        domain = domain.replace(/^(www\.)?/i, '');
        // Remove path
        domain = domain.split('/')[0];
        return domain;
    };

    const showLoading = (container) => {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48">
                <svg class="h-10 w-10 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                <p class="mt-4 text-blue-200">Fetching data...</p>
            </div>
        `;
    };

    const renderError = (container, message) => {
        container.innerHTML = `<div class="text-center text-red-400 bg-red-500/10 p-4 rounded-lg">${message}</div>`;
    };
    
    const sanitizeHTML = (str) => {
        if (str === null || str === undefined) return '';
        const temp = document.createElement('div');
        temp.textContent = str.toString();
        return temp.innerHTML;
    }

    const fetchData = async (url, container) => {
        showLoading(container);
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (!response.ok || data.ErrorMessage) {
                throw new Error(data.ErrorMessage?.msg || `API request failed with status ${response.status}`);
            }
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            renderError(container, message);
            return null;
        }
    };

    if (dnsForm) {
        dnsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(dnsForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            const url = `https://dns.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${domain}&type=_all`;
            const data = await fetchData(url, resultsContainer);
            if (data) renderDnsResults(resultsContainer, data);
        });
    }

    if (whoisForm) {
        whoisForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(whoisForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`;
            const data = await fetchData(url, resultsContainer);
            if (data) renderWhoisResults(resultsContainer, data);
        });
    }

    if (nsForm) {
        nsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(nsForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`;
            const data = await fetchData(url, resultsContainer);
            if (data) renderNameserverResults(resultsContainer, data);
        });
    }

    if (hostingForm) {
        hostingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(hostingForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            
            const dnsUrl = `https://dns.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${domain}&type=A`;
            const dnsData = await fetchData(dnsUrl, resultsContainer);

            if (dnsData?.DNSData?.dnsRecords?.[0]?.address) {
                const ipAddress = dnsData.DNSData.dnsRecords[0].address;
                const geoUrl = `https://ip-geolocation.whoisxmlapi.com/api/v1?apiKey=${apiKey}&ipAddress=${ipAddress}`;
                const geoData = await fetchData(geoUrl, resultsContainer);
                if (geoData) renderHostingResults(resultsContainer, geoData, domain, ipAddress);
            } else {
                 renderError(resultsContainer, `Could not resolve an IP address for ${sanitizeHTML(domain)}.`);
            }
        });
    }

    if (downForm) {
        downForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const domain = sanitizeDomain(downForm.querySelector('input').value);
            if (!domain) return;
            const resultsContainer = document.getElementById('results-container');
            const url = `https://website-status.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${domain}`;
            const data = await fetchData(url, resultsContainer);
            if (data) renderWebsiteDownResults(resultsContainer, data, domain);
        });
    }
    
    const renderDnsResults = (container, data) => {
        if (!data?.DNSData?.dnsRecords || data.DNSData.dnsRecords.length === 0) {
            return renderError(container, 'No DNS records found for this domain.');
        }
        let html = '<div class="space-y-4">';
        data.DNSData.dnsRecords.forEach(rec => {
            const value = rec.address || rec.target || rec.value || rec.name || JSON.stringify(rec);
            html += `
                <div class="p-3 bg-white/10 rounded-lg">
                    <strong class="text-blue-300 font-semibold">${sanitizeHTML(rec.type)}</strong>
                    <div class="pl-4 text-blue-100/90 break-words">${sanitizeHTML(value)}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    };

    const renderWhoisResults = (container, data) => {
        const record = data?.WhoisRecord;
        if (!record || !record.createdDate) {
            return renderError(container, 'No WHOIS record found. The domain might be available.');
        }
        const displayData = {
            "Domain Name": record.domainName,
            "Registrar": record.registrarName,
            "Creation Date": record.createdDate ? new Date(record.createdDate).toDateString() : 'N/A',
            "Expiration Date": record.expiresDate ? new Date(record.expiresDate).toDateString() : 'N/A',
            "Updated Date": record.updatedDate ? new Date(record.updatedDate).toDateString() : 'N/A',
            "Status": Array.isArray(record.status) ? record.status.join(', ') : record.status,
            "Name Servers": record.nameServers?.hostNames?.join('<br>'),
            "Registrant Contact": `${record.registrant?.name || ''} <br> ${record.registrant?.organization || ''} <br> ${record.registrant?.email || ''}`.replace(/<br>\s*<br>/g, '<br>').trim(),
        };
        let html = '<div class="space-y-2">';
        for (const [key, value] of Object.entries(displayData)) {
            if (value && value.replace(/<br>/g, '').trim()) {
                html += `
                    <div class="flex flex-col sm:flex-row border-b border-white/10 pb-2">
                        <dt class="w-full sm:w-1/3 font-semibold text-blue-200/70">${sanitizeHTML(key)}:</dt>
                        <dd class="w-full sm:w-2/3 text-blue-100 break-words">${value}</dd> <!-- No sanitization for value to allow <br> -->
                    </div>
                `;
            }
        }
        html += '</div>';
        container.innerHTML = html;
    };

    const renderNameserverResults = (container, data) => {
        const nameservers = data?.WhoisRecord?.nameServers?.hostNames;
        if (!nameservers || nameservers.length === 0) {
            return renderError(container, 'No nameservers found for this domain.');
        }
        let html = `
            <h3 class="text-xl font-bold text-blue-200 mb-4">Nameservers for ${sanitizeHTML(data.WhoisRecord.domainName)}:</h3>
            <ul class="list-disc list-inside space-y-2">
        `;
        nameservers.forEach(ns => {
            html += `<li class="p-2 bg-white/10 rounded">${sanitizeHTML(ns)}</li>`;
        });
        html += '</ul>';
        container.innerHTML = html;
    };

    const renderHostingResults = (container, data, domain, ip) => {
        if (!data?.isp) {
             return renderError(container, `Could not determine hosting provider for ${sanitizeHTML(domain)}.`);
        }
        const displayData = {
            "Domain": domain,
            "IP Address": ip,
            "Hosting Provider (ISP)": data.isp,
            "Organization": data.as?.name,
            "Location": `${data.location?.city}, ${data.location?.region}, ${data.location?.country}`
        };
        let html = '<div class="space-y-2">';
        for (const [key, value] of Object.entries(displayData)) {
            if (value) {
                html += `
                    <div class="flex flex-col sm:flex-row border-b border-white/10 pb-2">
                        <dt class="w-full sm:w-1/3 font-semibold text-blue-200/70">${sanitizeHTML(key)}:</dt>
                        <dd class="w-full sm:w-2/3 text-blue-100 break-words">${sanitizeHTML(value)}</dd>
                    </div>
                `;
            }
        }
        html += '</div>';
        container.innerHTML = html;
    };

    const renderWebsiteDownResults = (container, data, domain) => {
        const isUp = data?.online;
        const statusClass = isUp ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300';
        const statusText = isUp ? 'UP and running' : 'DOWN';
        container.innerHTML = `
            <div class="${statusClass} p-6 rounded-lg text-center">
                <h3 class="text-3xl font-bold">
                    ${sanitizeHTML(domain)} is <span class="uppercase">${statusText}</span>
                </h3>
                ${isUp ? `<p class="mt-2">The website appears to be online from our location. Response time: ${data.responseTimeMs}ms</p>` : `<p class="mt-2">We were unable to connect to the website. It might be down for everyone.</p>`}
            </div>
        `;
    };
});