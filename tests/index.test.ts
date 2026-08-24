import { runAIEngineTests } from './aiEngine.test';
import { runRetryEngineTests } from './retryEngine.test';
import { runWebhookTests } from './webhook.test';

async function main() {
  console.log('🚀 Running AutoRevive AI Comprehensive Test Suite...\n');

  const t1 = runAIEngineTests();
  console.log('');
  const t2 = runRetryEngineTests();
  console.log('');
  const t3 = runWebhookTests();
  console.log('');

  if (t1 && t2 && t3) {
    console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY! (100% PASS)');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

main();
