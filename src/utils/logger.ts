import winston from 'winston';


const maskSensitive = (input: any): any => {
  const data = JSON.parse(JSON.stringify(input)); // deep copy


   if (typeof data.body === 'string') {
    try {
      data.body = JSON.parse(data.body);
    } catch {
      // leave as-is if not parsable
    }
  }

  if (data?.customerId) {
    data.customerId = '***';
  }

  if (data?.shippingAddress?.street) {
    data.shippingAddress.street = '***';
  }

   if (typeof data.body === 'object') {
    if (data.body.customerId) {
      data.body.customerId = '***';
    }
    if (data.body.shippingAddress?.street) {
      data.body.shippingAddress.street = '***';
    }
  } 

  return data;
};

const maskFormat = winston.format((info) => {
  if (info.data) {
    info.data = maskSensitive(info.data);
  }
  if (info.raw) {
    info.raw = maskSensitive(info.raw);
  }
  return info;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    maskFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

