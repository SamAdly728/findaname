
import { GoogleGenAI, Type } from '@google/genai';
import type { WhoisData } from '../types';
import { DomainStatus } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a list of creative domain names based on a keyword using the Gemini API.
 * @param keyword - The keyword to base domain names on.
 * @returns A promise that resolves to an array of objects, each with a domain name and a creative description.
 */
export const generateDomains = async (keyword: string): Promise<{name: string, description: string}[]> => {
  const prompt = `
    As a world-class branding expert and a savvy affiliate marketer, generate 21 creative and brandable domain names based on the concept: "${keyword}".

    Your suggestions must be strategically optimized for high affiliate commissions on Namecheap based on their payout structure.
    
    Naming Strategies:
    - Use evocative, metaphorical, portmanteau, and abstract naming styles.

    Affiliate & TLD Strategy:
    - **PRIORITIZE HIGH-COMMISSION TLDs:** Focus heavily on TLDs with good commission rates: .com, .io, .ai, .co, .app, .xyz, .tech, .org, .net, and .dev.
    - **AVOID ZERO-COMMISSION CATEGORIES:** Absolutely avoid suggesting domains with TLDs like '.inc' or names that imply a zero-commission product like a trial, marketplace listing, or free app.
    
    Description Requirement:
    - For each name, provide a concise "description" that explains the creative concept.
    - **STRATEGIC UPSELL:** In the description, naturally suggest a valuable next step that leads to a high-commission product. Prioritize upselling annual hosting plans (35% commission) or VPNs (53% commission) where contextually appropriate.
    - Example Description Format: "A sharp, memorable name for a new fintech app, perfect for launching on Namecheap's secure annual hosting." or "An evocative name for a privacy blog, which you can protect with Namecheap's high-speed VPN."

    CRITICAL RULES:
    1.  **NO BORING NAMES:** Avoid simple keyword additions.
    2.  **JSON OUTPUT:** The final output must be a valid JSON object strictly adhering to the provided schema.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          domains: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: 'The full domain name, including a high-commission TLD.'
                },
                description: {
                  type: Type.STRING,
                  description: 'A creative concept with an integrated upsell suggestion for a high-commission service like hosting or VPNs.'
                }
              },
              required: ['name', 'description']
            },
            description: 'An array of 21 domain name objects.'
          }
        }
      }
    }
  });

  try {
    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.domains || [];
  } catch (e) {
    console.error("Failed to parse Gemini response:", e, response.text);
    return [];
  }
};

/**
 * Checks domain availability using the Namecheap API.
 * This uses the Namecheap sandbox environment. To go live, you'll need a production API key.
 * @param domainName - The domain name to check.
 * @returns A promise that resolves to DomainStatus.
 */
export const checkAvailability = async (domainName: string): Promise<DomainStatus> => {
  // --- ACTION REQUIRED: REPLACE PLACEHOLDERS WITH YOUR CREDENTIALS ---
  // 1. Get your API Key from your Namecheap account: Profile -> Tools -> Namecheap API Access
  // 2. Whitelist your public IP address in the same section. Google "what is my ip" to find it.
  
  const API_USER = 'your_namecheap_username';     // <-- PASTE your Namecheap Username here
  const API_KEY = 'your_namecheap_api_key';       // <-- PASTE your Namecheap API Key here
  const USER_NAME = 'your_namecheap_username';    // <-- PASTE your Namecheap Username here (again)
  const CLIENT_IP = 'your_public_ip_address';   // <-- PASTE your whitelisted public IP address here

  // For testing, use the sandbox URL. For production, change to 'https://api.namecheap.com/xml.response'.
  const API_ENDPOINT = 'https://api.sandbox.namecheap.com/xml.response';

  const url = `${API_ENDPOINT}?ApiUser=${API_USER}&ApiKey=${API_KEY}&UserName=${USER_NAME}&Command=namecheap.domains.check&ClientIp=${CLIENT_IP}&DomainList=${domainName}`;

  try {
    // If your API credentials are just placeholders, the call will fail.
    if (API_KEY === 'your_namecheap_api_key' || CLIENT_IP === 'your_public_ip_address') {
        console.warn("Namecheap API credentials are placeholders. Domain check is disabled.");
        return DomainStatus.Unknown;
    }
      
    const response = await fetch(url);
    if (!response.ok) {
        console.error("Namecheap API request failed:", response.statusText);
        return DomainStatus.Unknown;
    }

    const xmlText = await response.text();
    // Simple XML parsing: check if the 'Available' attribute is true.
    if (xmlText.includes(`IsAvailable="true"`)) {
      return DomainStatus.Available;
    } else if (xmlText.includes(`IsAvailable="false"`)) {
      return DomainStatus.Taken;
    } else {
      // This can happen if the API key is wrong or IP is not whitelisted.
      console.error("Could not determine domain status from Namecheap response:", xmlText);
      return DomainStatus.Unknown;
    }
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return DomainStatus.Unknown;
  }
};


/**
 * Generates simulated WHOIS data for a given domain name using the Gemini API.
 * @param domainName - The domain for which to generate WHOIS data.
 * @returns A promise that resolves to a WhoisData object.
 */
export const getWhoisInfo = async (domainName: string): Promise<WhoisData> => {
  const prompt = `Generate realistic but fake WHOIS data for the registered domain "${domainName}". Provide data for registrar, creation date, expiration date, name servers, and domain status.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          registrar: { type: Type.STRING, description: "e.g., GoDaddy, Namecheap" },
          creationDate: { type: Type.STRING, description: "ISO 8601 format date" },
          expirationDate: { type: Type.STRING, description: "ISO 8601 format date" },
          nameServers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "e.g., ['ns1.domain.com', 'ns2.domain.com']"
          },
          status: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "e.g., ['clientTransferProhibited', 'ok']"
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
};