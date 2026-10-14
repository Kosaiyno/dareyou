import { createDareOnChain, fetchOnChainDares, getGenLayerClient, GENLAYER_REGISTRY_ADDRESS } from '../src/services/genlayerService.ts';

console.log(`=== Broadcasting Man City Allegations Challenge to DareRegistry at ${GENLAYER_REGISTRY_ADDRESS} ===`);

const manCityDare = {
  title: "Dare you to investigate the official Premier League charges against Manchester City by identifying the specific financial season where alleged undisclosed managerial remuneration occurred, cross-referencing published leak documents against club statutory Companies House filings, and substantiating whether primary documents confirm direct third-party offshore payment routing within 5 minutes.",
  category: "CONFLICTING_SOURCE_INVESTIGATION",
  claim: "Leaked contract emails alleged that more than £1.5m in annual compensation was routed through an offshore entity rather than declared in statutory Companies House accounts.",
  requiredSources: "Premier League official charge sheet releases, Club statutory annual accounts filed at Companies House, and contemporary investigative disclosures.",
  criteria: "Delineate declared base salary from alleged third-party offshore consultancy payments and document exact fiscal year discrepancies.",
  stakeCents: 500, // 5 GEN ($5.00)
  durationSeconds: 300 // 5 minutes
};

async function broadcast() {
  try {
    console.log("Broadcasting create_dare transaction to GenLayer StudioNet...");
    const txHash = await createDareOnChain(manCityDare);
    console.log(`✓ Real Transaction Broadcast: ${txHash}`);

    const client = getGenLayerClient();
    console.log("Waiting for validator consensus receipt...");
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    console.log(`✓ Consensus Receipt: ${receipt.status_name} (${receipt.result_name || 'AGREE'})`);

    const onChainDares = await fetchOnChainDares();
    console.log(`✓ Total On-Chain Dares in Registry: ${onChainDares.length}`);
    for (const d of onChainDares) {
      console.log(`Dare #${d.id} [${d.status}]: ${d.title.substring(0, 70)}... (${d.durationSeconds}s / $${(d.stakeCents/100).toFixed(2)} GEN)`);
    }
  } catch (err) {
    console.error("Error broadcasting challenge:", err);
    process.exit(1);
  }
}

broadcast();
