import twilio from "twilio";

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

export interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

export async function sendSms(params: SendSmsParams) {
  const isSandbox = process.env.SANDBOX_MODE === "true";

  if (isSandbox) {
    console.log("[SANDBOX] SMS would be sent:", params);
    return {
      sid: `sim_${Date.now()}`,
      status: "SIMULATED" as const,
    };
  }

  const client = getClient();
  const message = await client.messages.create({
    to: params.to,
    from: params.from || process.env.TWILIO_PHONE_NUMBER,
    body: params.body,
  });

  return {
    sid: message.sid,
    status: "SENT" as const,
  };
}

export interface InitiateCallParams {
  to: string;
  from?: string;
  twiml: string;
}

export async function initiateCall(params: InitiateCallParams) {
  const isSandbox = process.env.SANDBOX_MODE === "true";

  if (isSandbox) {
    console.log("[SANDBOX] Call would be initiated:", params);
    return {
      sid: `sim_call_${Date.now()}`,
      status: "SIMULATED" as const,
    };
  }

  const client = getClient();
  const call = await client.calls.create({
    to: params.to,
    from: params.from || process.env.TWILIO_PHONE_NUMBER || "",
    twiml: params.twiml,
    record: true,
  });

  return {
    sid: call.sid,
    status: "INITIATED" as const,
  };
}

export function buildTwiml(options: {
  playUrl?: string;
  sayText?: string;
  gatherDigits?: boolean;
}): string {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  if (options.gatherDigits) {
    twiml += '<Gather numDigits="1" action="/api/twilio/gather">';
  }

  if (options.playUrl) {
    twiml += `<Play>${options.playUrl}</Play>`;
  } else if (options.sayText) {
    twiml += `<Say voice="Polly.Joanna">${options.sayText}</Say>`;
  }

  if (options.gatherDigits) {
    twiml += "</Gather>";
  }

  twiml += "</Response>";
  return twiml;
}
