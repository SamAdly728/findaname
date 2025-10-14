import { GoogleGenAI, Type } from '@google/genai';
import type { WhoisData } from '../types';
import { DomainStatus } from '../types';

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * Throws an error if the API key is not available in the environment variables.
 * @returns {GoogleGenAI} The initialized GoogleGenAI client.
 */
function getAiClient(): GoogleGenAI {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // This error will be caught by the calling function in App.tsx
    throw new Error('VITE_GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generates a list of creative domain names based on a keyword using the Gemini API.
 * @param keyword - The keyword to base domain names on.
 * @returns A promise that resolves to an array of objects, each with a domain name and a creative description.
 */
export const generateDomains = async (keyword: string): Promise<{name: string, description: string}[]> => {
  const ai = getAiClient(); // Get client instance here
  const prompt = `
    As a world-class branding expert and a savvy affiliate marketer, generate 21 creative and brandable domain names based on the concept: "${keyword}".

    Your suggestions must be strategically optimized for high affiliate commissions on popular domain registrars.
    
    Naming Strategies:
    - Use evocative, metaphorical, portmanteau, and abstract naming styles.

    Affiliate & TLD Strategy:
    - **PRIORITIZE HIGH-COMMISSION TLDs:** Focus heavily on TLDs with good commission rates: .com, .io, .ai, .co, .app, .xyz, .tech, .org, .net, and .dev.
    - **AVOID ZERO-COMMISSION CATEGORIES:** Absolutely avoid suggesting domains with TLDs that typically have low or zero commissions.
    
    Description Requirement:
    - For each name, provide a concise "description" that explains the creative concept.
    - **STRATEGIC UPSELL:** In the description, naturally suggest a valuable next step that leads to a high-commission product. Prioritize upselling annual hosting plans or security products where contextually appropriate.
    - Example Description Format: "A sharp, memorable name for a new fintech app, perfect for launching with a secure hosting package." or "An evocative name for a privacy blog, which you can protect with professional email and security add-ons."

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
                  description: 'A creative concept with an integrated upsell suggestion for a high-commission service like hosting or security.'
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
 * Checks domain availability using the WhoisXMLAPI.
 * @param domainName - The domain name to check.
 * @returns A promise that resolves to DomainStatus.
 */
export const checkAvailability = async (domainName: string): Promise<DomainStatus> => {
  const apiKey = 'at_r3gmzX6h7BWhsRcLyMAYNZJ1uQqsa';
  
  // The `credits` parameter with `DA` checks only Domain Availability and consumes fewer credits.
  const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domainName}&outputFormat=JSON&credits=DA`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`WhoisXMLAPI request failed: ${response.status} ${response.statusText}`);
      return DomainStatus.Unknown;
    }
    const data = await response.json();

    if (data.ErrorMessage) {
      console.error("WhoisXMLAPI error:", data.ErrorMessage.msg);
      return DomainStatus.Unknown;
    }
    
    // The API returns `domainAvailability` as 'AVAILABLE' or 'UNAVAILABLE'
    if (data.WhoisRecord?.domainAvailability === 'AVAILABLE') {
      return DomainStatus.Available;
    } else if (data.WhoisRecord?.domainAvailability === 'UNAVAILABLE') {
      return DomainStatus.Taken;
    }
    
    // Fallback: if domainAvailability is missing, but we have registrar info, it's likely taken.
    if (data.WhoisRecord?.registrarName) {
        return DomainStatus.Taken;
    }

    return DomainStatus.Unknown;
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return DomainStatus.Unknown;
  }
};


/**
 * Fetches real WHOIS data for a given domain name using the WhoisXMLAPI.
 * @param domainName - The domain for which to fetch WHOIS data.
 * @returns A promise that resolves to a WhoisData object.
 */
export const getWhoisInfo = async (domainName: string): Promise<WhoisData> => {
  const apiKey = 'at_r3gmzX6h7BWhsRcLyMAYNZJ1uQqsa';

  const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domainName}&outputFormat=JSON`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WhoisXMLAPI request failed with status ${response.status}`);
    }
    const data = await response.json();

    if (data.ErrorMessage) {
      return { error: data.ErrorMessage.msg };
    }

    const record = data.WhoisRecord;
    if (!record) {
      return { error: 'No WHOIS record found for this domain.' };
    }
    
    return {
      registrar: record.registrarName,
      creationDate: record.createdDate,
      expirationDate: record.expiresDate,
      nameServers: record.nameServers?.hostNames,
      // Status can be a single string; split it into an array for consistency
      status: typeof record.status === 'string' ? record.status.split(' ') : record.status,
    };
  } catch (error) {
    console.error("Error fetching WHOIS data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: `Failed to fetch WHOIS data: ${errorMessage}` };
  }
};