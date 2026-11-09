#!/usr/bin/env node
/** Manually run the retry sweep (the deployed scheduler does this every 10 minutes). */
import { retryDueInquiries } from '../src/services/inquiries.js';

retryDueInquiries()
  .then((r) => {
    console.log(r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
