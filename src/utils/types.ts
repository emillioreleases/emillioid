export type FlowAttestationPayload = { 
    flow: string, 
    social_auth?: { 
        code_challenge: string, 
        state: string, 
        nonce: string, 
        idp: string 
    }, 
    is_linking?: boolean 
}