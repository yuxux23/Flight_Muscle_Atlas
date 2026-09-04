"use client";

import { FormEvent, ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { atlasAssetUrl } from "./asset-url";

type Age = "D0" | "D25" | "D50";
type Layer = "integrated" | "hdwgcna" | "gnn" | "scenic";
type Tab = "workspace" | "landscape" | "explore" | "gnn" | "regulons" | "modules" | "methods";
type ColorMode = "module" | "program";
type StrengthTier = "weak" | "medium" | "strong";
type ConnectionOption = "hdwgcna" | "gnn-positive" | "gnn-negative" | "scenic" | "regulon";
type PairComparison = "D25-D0" | "D50-D25" | "D50-D0";
type Point = [number, number];
type Triple<T> = [T, T, T];

type Gene = {
  g: string;
  module: string;
  color: string;
  kme: number | null;
  hub: number | null;
  hdUmap: Point | null;
  hdDegree: number;
  program: string | null;
  confidence: number | null;
  silhouette: number | null;
  gnnUmap: Point | null;
  ageUmap: Triple<Point | null> | null;
  expression: Triple<number | null> | null;
  detection: Triple<number | null> | null;
  undetectedAges: Age[];
  displacement: Triple<number | null> | null;
  directional: Triple<number | null> | null;
  turnover: number | null;
  correlationProfileChange: number | null;
  weightedStrengthChange: number | null;
  graph: Triple<{ degree: number; weightedDegree: number; isolated: boolean; componentSize: number } | null> | null;
  isRegulon: boolean;
  regulonSize: number;
  regulators: number;
  modelCount: number;
};

type HDEdge = { g: string; tom: number };
type GnnEdge = { g: string; present: Triple<number>; corr: Triple<number>; transition: string };
type GnnPair = { present: Triple<number>; corr: Triple<number>; transition: string };
type ScenicEdge = { g: string; weight: number; rank: number; percentile: number };
type ScenicPair = [source: string, target: string, weight: number, rank: number, percentile: number];
type AllPairCorrelations = {
  file: string;
  encoding: "signed-int16-little-endian";
  scale: number;
  pairCount: number;
  geneOrder: string[];
  ages: Age[];
  source: string;
};
type Activity = {
  mean: [number, number, number];
  quartiles: [[number, number, number], [number, number, number], [number, number, number]];
  delta: number;
  relativeDelta: number;
  pattern: string;
  qcAffected: boolean;
  rawTargets: number;
};
type ModuleData = {
  id: string;
  color: string;
  genes: number;
  medianKME: number;
  hubs: { g: string; kme: number }[];
  regulons: number;
  programMix: Record<string, number>;
  enrichment: { term: string; source: string; p: number; genes: number }[];
};
type Trend = Activity & {
  g: string;
  module: string;
  program: string;
  targets: number;
  hub: number | null;
};
type ProgramData = {
  id: string;
  genes: number;
  percent: number;
  dominantModules: string;
  meanSilhouette: number;
  meanConfidence: number;
  representatives: string[];
  medianDisplacement: number;
  medianDirectional: number;
  medianLatentChange: number;
  topDisplacement: string[];
  topDirectional: string[];
  medianBootstrapJaccard: number | null;
  minBootstrapJaccard: number | null;
};
type GraphAge = {
  age: Age;
  edges: number;
  meanDegree: number;
  medianDegree: number;
  maxDegree: number;
  isolated: number;
  giantComponentPercent: number;
  medianAbsCorrelation: number;
  p95AbsCorrelation: number;
  fractionBelowPointOne: number;
};
type DynamicEdge = { a: string; b: string; present: Triple<number>; corr: Triple<number>; delta: number; transition: string };
type DecoderCandidate = { direction: "increase" | "decrease"; rank: number; a: string; b: string; programA: string; programB: string; delta: number; logits: Triple<number>; corr: Triple<number> };
type ConsensusEdge = { source: string; target: string; support: number; scenicWeight: number; scenicPercentile: number | null; tom: number | null; gnnPresent: Triple<number> | null; gnnCorr: Triple<number> | null };
type Atlas = {
  meta: {
    title: string;
    organism: string;
    tissue: string;
    ages: Age[];
    genes: number;
    coreGenes: number;
    hdwgcnaGenes: number;
    hdwgcnaEdges: number;
    gnnGenes: number;
    gnnUnionEdges: number;
    gnnPrograms: number;
    regulons: number;
    rawRegulons: number;
    excludedRegulons: string[];
    excludedScenicTargets: string[];
    excludedScenicTargetEdges: number;
    activityQcRegulons: number;
    scenicEdges: number;
    metacells: number;
    metacellsByAge: Record<Age, number>;
    cellsByAge: Record<Age, number>;
    sourceFolders: string[];
    localOnly: boolean;
  };
  summary: {
    moduleCounts: Record<string, number>;
    tom: { threshold: number; median: number; p95: number; maximum: number };
    regulonSize: { median: number; maximum: number };
    gnn: { topK: number; correlationFloor: number; bestEpoch: number; meanValidationAP: number; silhouette: number; meanMembershipConfidence: number; subsampleAri: number; minimumClusterMedianJaccard: number };
    crossMethod: { regulonsInModules: number; regulonHubs: number; programModuleAriNonGrey: number; programModuleNmiNonGrey: number; hubKmeSpearmanAll: number; hubKmeSpearmanNonGrey: number; hdGnnEdges: number; hdScenicEdges: number; gnnScenicEdges: number; allThreeEdges: number; tripleModelGenes: number };
    integrity: { status: string; checks: number; passed: number };
  };
  modules: ModuleData[];
  programs: ProgramData[];
  genes: Gene[];
  hdEdges: Record<string, HDEdge[]>;
  gnnEdges: Record<string, GnnEdge[]>;
  gnnPairs: Record<string, GnnPair>;
  allPairCorrelations: AllPairCorrelations;
  scenicOutgoing: Record<string, ScenicEdge[]>;
  scenicIncoming: Record<string, ScenicEdge[]>;
  scenicPairs: ScenicPair[];
  activity: Record<string, Activity>;
  tfTrends: Trend[];
  graphAges: GraphAge[];
  graphOverlap: { a: Age; b: Age; jaccard: number }[];
  linkEvaluation: { type: string; age: Age; auroc: number | null; ap: number | null; gnnAuroc: number | null; gnnAp: number | null; corrAuroc: number | null; corrAp: number | null }[];
  sensitivity: { analysis: string; setting: string; value: string | null; ap: number | null; displacementSpearman: number | null; directionalSpearman: number | null; clusterAri: number | null }[];
  dynamicEdges: DynamicEdge[];
  decoderCandidates: DecoderCandidate[];
  consensusEdges: ConsensusEdge[];
  programModuleMatrix: Record<string, Record<string, number>>;
  notes: string[];
};

type VisualEdge = {
  source: string;
  target: string;
  kind: "hdwgcna" | "gnn" | "scenic";
  tom?: number;
  corr?: Triple<number>;
  present?: Triple<number>;
  transition?: string;
  weight?: number;
  rank?: number;
  percentile?: number;
};
type LandscapeGroup = {
  id: string;
  genes: number;
  color: string;
  order: string[];
};

const AGES: Age[] = ["D0", "D25", "D50"];
const MODULE_COLORS: Record<string, string> = {
  turquoise: "#40d5bf",
  brown: "#d69b6a",
  blue: "#74aefc",
  yellow: "#f2d36f",
  green: "#79cf91",
  grey: "#87909d",
  unassigned: "#6d7785",
};
const PROGRAM_COLORS: Record<string, string> = {
  C1: "#48d8c2",
  C2: "#63a8ff",
  C3: "#bd91ff",
  C4: "#f2a766",
  C5: "#ef6f91",
  C6: "#d5d96d",
  unassigned: "#6d7785",
};
const WORKSPACE_MODULES = ["IFM-M1", "IFM-M2", "IFM-M3", "IFM-M4", "IFM-M5"];
const WORKSPACE_PROGRAMS = ["C1", "C2", "C3", "C4", "C5", "C6"];
const CONNECTION_OPTIONS: ConnectionOption[] = ["hdwgcna", "gnn-positive", "gnn-negative", "scenic", "regulon"];
const GNN_PROXIMITY_CEILING = 0.30;
const PAIR_COMPARISONS: { id: PairComparison; earlier: number; later: number; label: string }[] = [
  { id: "D25-D0", earlier: 0, later: 1, label: "D25 − D0" },
  { id: "D50-D25", earlier: 1, later: 2, label: "D50 − D25" },
  { id: "D50-D0", earlier: 0, later: 2, label: "D50 − D0" },
];

const TERM_DEFINITIONS = {
  ifm: "Indirect flight muscle: the adult Drosophila muscle group analyzed in these exported results.",
  hdwgcna: "High-dimensional WGCNA: a workflow that adapts weighted gene co-expression network analysis to single-cell and other high-dimensional transcriptomic data.",
  module: "A group of genes assigned together because their expression profiles have similar network structure. Module membership is association, not proof of a shared mechanism.",
  signed: "A signed network emphasizes positive expression correlations. Negatively correlated genes receive low adjacency and are less likely to share a module.",
  hub: "Here, a hub is a gene included among the 25 highest-kME genes exported for its module. Rank 1 has the highest kME in that exported list.",
  kme: "Eigengene-based connectivity, also called module membership: the correlation between a gene's expression profile and its module eigengene.",
  tom: "Topological overlap measure: a co-expression similarity that considers both a gene pair's connection and the neighbors they share. This atlas includes exported TOM edges above 0.10.",
  tomDegree: "The number of exported TOM > 0.10 relationships incident on this gene in the full hdWGCNA edge table.",
  strength: "A display category, not a significance test. hdWGCNA and GNN use method-specific median and 95th-percentile tiers; SCENIC uses within-target retained-regulator rank. Unlike scores are never averaged.",
  scenic: "Single-Cell rEgulatory Network Inference and Clustering: a workflow combining TF–target co-expression, motif enrichment, and per-sample regulon activity scoring.",
  tf: "Transcription factor: a regulatory protein whose DNA-binding activity can influence transcription of target genes.",
  regulon: "In this SCENIC result, a transcription factor plus candidate target genes retained after co-expression and motif-enrichment filtering.",
  regulonWeight: "Custom gradient-boosting importance for a retained TF→target pair. It is comparable among regulators of the same target, not safely across different targets, and is not a probability or causal effect.",
  aucell: "A rank-based gene-set activity score. Higher values mean regulon genes are nearer the top of a metacell's expression ranking. Compare the same regulon across ages; raw values need not be comparable across differently sized regulons.",
  metacell: "An aggregate of neighboring, similar single cells used to reduce sparsity. Here metacells were constructed within cell-type and sample groups.",
  pearson: "Pearson correlation ranges from −1 to +1 and summarizes linear co-variation. It does not establish regulation or causality.",
  umap: "A two-dimensional projection of high-dimensional network profiles. Nearby points are similar in the embedding, but axis values and exact distances are not direct interaction strengths.",
  customGbt: "The local SCENIC workflow fits a separate scikit-learn GradientBoostingRegressor for each target gene. This is a custom pipeline, not the GRNBoost2 implementation.",
  motif: "A short DNA sequence pattern associated with transcription-factor binding. Motif support narrows candidates but does not prove binding in this tissue.",
  nes: "Normalized enrichment score for motif ranking. The stringent SCENIC run retained motif enrichments at NES ≥ 3.0.",
  enrichment: "Over-representation of annotated functions among module genes. The supplied g:Profiler results use g:SCS correction and the default annotated-gene domain, not a custom 2,387-gene IFM background; treat them as descriptive context.",
  grey: "The conventional WGCNA label for genes not assigned to a defined co-expression module; it is not interpreted as one coherent biological module.",
  softPower: "An exponent applied to correlation-based similarity to emphasize stronger relationships while retaining weighted edges. This network used power 7.",
  pooled: "One network constructed with D0, D25, and D50 together. Its TOM weights are shared across ages rather than independently fitted at each age.",
  iqr: "Interquartile range: the middle 50% of metacell scores, from the 25th to the 75th percentile. A wider interval indicates more heterogeneous activity.",
  gnn: "A graph neural network: here, a shared variational graph autoencoder learns gene embeddings from three age-specific co-expression graphs and gene-level expression features.",
  program: "One of six unsupervised groups in the consensus GNN embedding. A program is not a known cell class or automatically validated biological module.",
  graphEdge: "A GNN input-graph pair retained at that age after each gene nominated up to 15 strongest absolute-Pearson partners with |r| ≥ 0.05, followed by symmetrization.",
  appeared: "A pair absent from the earlier retained top-15-plus-threshold graph and present in the later graph. It does not mean either gene switched expression on.",
  displacement: "Euclidean distance between a gene's learned embeddings at two ages. Larger values indicate more movement in model space, not a signed biological effect.",
  directionalChange: "One minus cosine similarity between age-specific embeddings. It captures a change in embedding direction and is distinct from Euclidean displacement.",
  turnover: "One minus the Jaccard overlap of a gene's retained graph neighbors at D0 and D50. High turnover means its selected neighborhood changed substantially.",
  membershipConfidence: "The fraction of aligned 80%-gene-subsample runs that assign a gene to the same GNN program as the main result.",
  silhouette: "How much closer a gene is to its own program than to other programs in the consensus embedding. Negative values indicate ambiguous placement.",
  edgeJaccard: "Intersection divided by union for retained edge sets. Values near zero mean few exact pairs are shared between ages.",
  decoder: "The variational graph autoencoder scores candidate pairs with standardized decoder logits. These model scores are not probabilities and are different from graph membership or Pearson correlation.",
  hardNegative: "An absent pair chosen to have a similar absolute correlation distribution to positive edges. It is a more demanding internal graph-recovery test than random absent pairs.",
  ari: "Adjusted Rand index: agreement between two partitions after chance correction. Here it compares GNN programs with hdWGCNA modules; it is not a truth or accuracy score.",
  nmi: "Normalized mutual information: shared information between two partitions on a 0–1 scale. Here it measures agreement, not biological validity.",
  sampleConfounding: "Each age corresponds to one observed sample/library. Age-associated differences therefore cannot be separated from sample-specific differences in this dataset.",
  detection: "Fraction of IFM cells at an age with detectable expression for the gene. Zero means the gene was undetected in that age's retained cells.",
  activityQc: "This flag marks a regulon whose exported AUCell activity was calculated before erroneous h/dl target aliases were removed. Network targets are QC-filtered, while the activity values remain the upstream export and should be interpreted cautiously.",
  proximity: "In the gene workspace, shorter distance means a stronger displayed connection. Age-responsive distance uses absolute Pearson correlation when a GNN pair is available; SCENIC rank or hdWGCNA co-expression is used only when no age-specific pair is available.",
  scenicArrow: "A red arrow points from a SCENIC transcription factor to its motif-pruned candidate target. Arrow width follows the TF's rank among retained regulators for that same target; it is not an age-specific causal effect.",
  autoFilters: "All five defined hdWGCNA modules and all six GNN programs are enabled on first load, which means no group restriction (grey genes may still appear). Turning a named group off filters surrounding nodes, while selected center genes remain visible.",
  connectionFilter: "Each switch independently shows or hides one connection type. Positive and negative GNN Pearson correlations can be separated; the TF regulon switch controls red node rings rather than an edge.",
} as const;

type TermKey = keyof typeof TERM_DEFINITIONS;

function GlossaryTerm({ term, children, placement = "center" }: { term: TermKey; children: ReactNode; placement?: "left" | "center" | "right" }) {
  const tooltipId = useId();
  return (
    <span className={`glossary-term placement-${placement}`}>
      <button type="button" aria-describedby={tooltipId}>{children}<i aria-hidden="true">?</i></button>
      <span id={tooltipId} role="tooltip">{TERM_DEFINITIONS[term]}</span>
    </span>
  );
}

const CONNECTION_LABELS: Record<ConnectionOption, string> = {
  hdwgcna: "hdWGCNA co-expression",
  "gnn-positive": "Positive GNN r",
  "gnn-negative": "Negative GNN r",
  scenic: "SCENIC TF → target",
  regulon: "TF regulon ring",
};

function edgeConnectionOption(edge: VisualEdge, ageIndex: number): Exclude<ConnectionOption, "regulon"> {
  if (edge.kind === "hdwgcna") return "hdwgcna";
  if (edge.kind === "scenic") return "scenic";
  return (edge.corr?.[ageIndex] || 0) < 0 ? "gnn-negative" : "gnn-positive";
}

function ConnectionToggleGroup({
  value,
  onChange,
  ariaLabel,
}: {
  value: ConnectionOption[];
  onChange: (next: ConnectionOption[]) => void;
  ariaLabel: string;
}) {
  const allSelected = CONNECTION_OPTIONS.every((option) => value.includes(option));
  const toggle = (option: ConnectionOption) => {
    onChange(value.includes(option)
      ? value.filter((item) => item !== option)
      : [...value, option]);
  };
  return (
    <div className="connection-toggle-group" role="group" aria-label={ariaLabel}>
      {CONNECTION_OPTIONS.map((option) => (
        <button
          type="button"
          key={option}
          className={`connection-toggle ${option} ${value.includes(option) ? "active" : ""}`}
          aria-pressed={value.includes(option)}
          onClick={() => toggle(option)}
        >
          <i aria-hidden="true" />
          {CONNECTION_LABELS[option]}
        </button>
      ))}
      <button
        type="button"
        className="connection-toggle-all"
        onClick={() => onChange(allSelected ? [] : CONNECTION_OPTIONS)}
      >
        {allSelected ? "Clear" : "All"}
      </button>
    </div>
  );
}

function colorFor(gene?: Gene, mode: ColorMode = "module") {
  if (mode === "program") return PROGRAM_COLORS[gene?.program || "unassigned"] || PROGRAM_COLORS.unassigned;
  return MODULE_COLORS[gene?.color || "unassigned"] || MODULE_COLORS.unassigned;
}

function meanGnnWeightedDegree(gene: Gene) {
  const snapshots = (gene.graph || []).flatMap((snapshot) => snapshot ? [snapshot] : []);
  if (!snapshots.length) return 0;
  return snapshots.reduce((sum, snapshot) => sum + snapshot.weightedDegree, 0) / snapshots.length;
}

function gnnPairKey(a: string, b: string) {
  return [a, b].sort((left, right) => left.localeCompare(right)).join("\t");
}

function readAllPairCorrelation(
  view: DataView | null,
  info: AllPairCorrelations | undefined,
  geneIndex: Map<string, number>,
  a: string,
  b: string,
): Triple<number> | null {
  if (!view || !info) return null;
  const first = geneIndex.get(a);
  const second = geneIndex.get(b);
  if (first == null || second == null) return null;
  if (first === second) return [0, 0, 0];
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  const genes = info.geneOrder.length;
  const pairsBeforeRow = low * (2 * genes - low - 1) / 2;
  const pairIndex = pairsBeforeRow + high - low - 1;
  const byteOffset = pairIndex * AGES.length * Int16Array.BYTES_PER_ELEMENT;
  if (byteOffset < 0 || byteOffset + 5 >= view.byteLength) return null;
  return AGES.map((_, index) =>
    view.getInt16(byteOffset + index * Int16Array.BYTES_PER_ELEMENT, true) / info.scale,
  ) as Triple<number>;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function displayModule(module: string) {
  return module.replace(/^IFM-/, "");
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function formatP(value: number) {
  if (value < 0.001) return value.toExponential(1);
  return value.toFixed(3);
}

function formatDetection(value: number) {
  if (value === 0) return "0%";
  if (value < 0.001) return "<0.1%";
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

function trendTone(delta: number) {
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}

function edgeStrength(edge: VisualEdge, tomMedian: number, tomP95: number, ageIndex: number, gnnMedian: number, gnnP95: number): StrengthTier {
  if (edge.kind === "hdwgcna") {
    if ((edge.tom || 0) >= tomP95) return "strong";
    if ((edge.tom || 0) >= tomMedian) return "medium";
    return "weak";
  }
  if (edge.kind === "gnn") {
    const value = Math.abs(edge.corr?.[ageIndex] || 0);
    if (value >= gnnP95) return "strong";
    if (value >= gnnMedian) return "medium";
    return "weak";
  }
  const percentile = edge.percentile || 0;
  if (percentile >= 0.8) return "strong";
  if (percentile >= 0.4) return "medium";
  return "weak";
}

function applyStrengthStyle(context: CanvasRenderingContext2D, tier: StrengthTier) {
  if (tier === "strong") {
    context.setLineDash([]);
    context.lineWidth = 3.4;
    context.globalAlpha = 0.92;
  } else if (tier === "medium") {
    context.setLineDash([9, 6]);
    context.lineWidth = 1.8;
    context.globalAlpha = 0.72;
  } else {
    context.setLineDash([2, 7]);
    context.lineWidth = 0.9;
    context.globalAlpha = 0.42;
  }
}

function MetricBars({
  values,
  labels = AGES,
  signed = false,
  format = (value: number) => value.toFixed(3),
}: {
  values: (number | null)[];
  labels?: string[];
  signed?: boolean;
  format?: (value: number) => string;
}) {
  const extent = Math.max(...values.map((value) => Math.abs(value || 0)), 0.00001);
  return (
    <div className="metric-bars">
      {values.map((value, index) => (
        <div className="metric-bar-row" key={`${labels[index]}-${index}`}>
          <span>{labels[index]}</span>
          <div className={`metric-track ${signed ? "signed" : ""}`}>
            {signed && <i className="zero-line" />}
            {value !== null && value !== 0 && (
              <i
                className={value >= 0 ? "positive" : "negative"}
                style={
                  signed
                    ? { width: `${Math.abs(value / extent) * 48}%`, left: value >= 0 ? "50%" : `${50 - Math.abs(value / extent) * 48}%` }
                    : { width: `${Math.abs(value / extent) * 100}%` }
                }
              />
            )}
          </div>
          <strong>{value === null ? "—" : format(value)}</strong>
        </div>
      ))}
    </div>
  );
}

function QuartileSummary({ quartiles }: { quartiles: Activity["quartiles"] }) {
  return (
    <div className="quartile-summary">
      <span><GlossaryTerm term="iqr" placement="left">IQR</GlossaryTerm></span>
      {quartiles.map((values, index) => <span key={AGES[index]}><b>{AGES[index]}</b><em>{values[0].toFixed(3)}–{values[2].toFixed(3)}</em></span>)}
    </div>
  );
}

function NetworkCanvas({
  center,
  edges,
  genes,
  ageIndex,
  tomMedian,
  tomP95,
  gnnMedian,
  gnnP95,
  colorMode,
  onSelect,
}: {
  center: string;
  edges: VisualEdge[];
  genes: Map<string, Gene>;
  ageIndex: number;
  tomMedian: number;
  tomP95: number;
  gnnMedian: number;
  gnnP95: number;
  colorMode: ColorMode;
  onSelect: (gene: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<{ g: string; x: number; y: number; radius: number }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const keyboardNodes = useMemo(
    () => Array.from(new Set(edges.flatMap((edge) => [edge.source, edge.target]))).filter((geneName) => geneName !== center),
    [center, edges],
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.floor(rect.width * ratio));
      const pixelHeight = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);

      context.fillStyle = "rgba(255,255,255,0.04)";
      for (let x = 20; x < width; x += 24) {
        for (let y = 20; y < height; y += 24) {
          context.beginPath();
          context.arc(x, y, 0.8, 0, Math.PI * 2);
          context.fill();
        }
      }

      const unique = Array.from(new Set(edges.flatMap((edge) => [edge.source, edge.target]).filter((gene) => gene !== center)));
      const centerX = width / 2;
      const centerY = height / 2;
      const shortSide = Math.min(width, height);
      const outerRadius = Math.min(shortSide * 0.39, 235);
      const innerRadius = Math.min(shortSide * 0.26, 155);
      const positions = new Map<string, { x: number; y: number; radius: number }>();
      positions.set(center, { x: centerX, y: centerY, radius: 26 });
      unique.forEach((gene, index) => {
        const ring = index % 3 === 0 ? innerRadius : outerRadius;
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(unique.length, 1) + (index % 2) * 0.06;
        positions.set(gene, {
          x: centerX + Math.cos(angle) * ring,
          y: centerY + Math.sin(angle) * ring * 0.82,
          radius: 14,
        });
      });

      edges.forEach((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.target);
        if (!from || !to) return;
        const tier = edgeStrength(edge, tomMedian, tomP95, ageIndex, gnnMedian, gnnP95);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const evidenceOffset = edge.kind === "hdwgcna" ? -7 : edge.kind === "scenic" ? 7 : 0;
        const controlX = (from.x + to.x) / 2 - (dy / distance) * evidenceOffset;
        const controlY = (from.y + to.y) / 2 + (dx / distance) * evidenceOffset;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.quadraticCurveTo(controlX, controlY, to.x, to.y);
        applyStrengthStyle(context, tier);
        if (edge.kind === "hdwgcna") {
          context.strokeStyle = "#43d8c1";
        } else if (edge.kind === "gnn") {
          context.strokeStyle = (edge.corr?.[ageIndex] || 0) >= 0 ? "#66b8ff" : "#f2a962";
        } else {
          context.strokeStyle = "#ff4f64";
        }
        context.stroke();
        if (edge.kind === "scenic") {
          const angle = Math.atan2(to.y - controlY, to.x - controlX);
          const arrowX = to.x - Math.cos(angle) * (to.radius + 4);
          const arrowY = to.y - Math.sin(angle) * (to.radius + 4);
          const size = tier === "strong" ? 7 : tier === "medium" ? 5.5 : 4;
          context.setLineDash([]);
          context.beginPath();
          context.moveTo(arrowX, arrowY);
          context.lineTo(arrowX - Math.cos(angle - 0.55) * size, arrowY - Math.sin(angle - 0.55) * size);
          context.lineTo(arrowX - Math.cos(angle + 0.55) * size, arrowY - Math.sin(angle + 0.55) * size);
          context.closePath();
          context.fillStyle = "#ff4f64";
          context.fill();
        }
      });
      context.setLineDash([]);
      context.globalAlpha = 1;

      const nodeList: { g: string; x: number; y: number; radius: number }[] = [];
      positions.forEach((position, geneName) => {
        const gene = genes.get(geneName);
        const isCenter = geneName === center;
        const isHovered = geneName === hovered;
        const radius = isCenter ? 27 : isHovered ? 18 : 14;
        if (isCenter || isHovered) {
          context.beginPath();
          context.arc(position.x, position.y, radius + 7, 0, Math.PI * 2);
          context.fillStyle = isCenter ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.09)";
          context.fill();
        }
        context.beginPath();
        context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        context.fillStyle = colorFor(gene, colorMode);
        context.fill();
        context.lineWidth = isCenter ? 3 : 1.2;
        context.strokeStyle = isCenter ? "#ffffff" : "rgba(255,255,255,0.52)";
        context.stroke();
        context.fillStyle = "#f7fbff";
        context.font = `${isCenter ? 700 : 600} ${isCenter ? 13 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillText(geneName.length > 19 ? `${geneName.slice(0, 17)}…` : geneName, position.x, position.y + radius + 7);
        nodeList.push({ g: geneName, x: position.x, y: position.y, radius: radius + 8 });
      });
      nodesRef.current = nodeList;
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [center, edges, genes, ageIndex, hovered, tomMedian, tomP95, gnnMedian, gnnP95, colorMode]);

  const hit = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return nodesRef.current.find((node) => Math.hypot(node.x - x, node.y - y) <= node.radius)?.g || null;
  };

  return (
    <div className="network-canvas-wrap">
      <canvas
        ref={ref}
        role="group"
        tabIndex={0}
        aria-label={`Interactive local gene network centered on ${center}. Use left and right arrow keys to move between neighboring genes, then Enter to recenter.`}
        onFocus={() => {
          if (!hovered && keyboardNodes.length) setHovered(keyboardNodes[0]);
        }}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) => {
          if (!keyboardNodes.length) return;
          if (event.key === "Enter" || event.key === " ") {
            if (hovered) onSelect(hovered);
            event.preventDefault();
            return;
          }
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
          const current = Math.max(0, keyboardNodes.indexOf(hovered || keyboardNodes[0]));
          const next = event.key === "Home"
            ? 0
            : event.key === "End"
              ? keyboardNodes.length - 1
              : (current + (event.key === "ArrowRight" ? 1 : -1) + keyboardNodes.length) % keyboardNodes.length;
          setHovered(keyboardNodes[next]);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const gene = hit(event);
          event.currentTarget.style.cursor = gene ? "pointer" : "default";
          setHovered(gene);
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(event) => {
          const gene = hit(event);
          if (gene && gene !== center) onSelect(gene);
        }}
      />
      <div className="canvas-note">Click a node, or focus the canvas and use ← / → + Enter</div>
    </div>
  );
}

function HubLandscapeCanvas({
  nodes,
  edges,
  groups,
  groupMode,
  ageIndex,
  selected,
  tomMedian,
  tomP95,
  gnnMedian,
  gnnP95,
  colorMode,
  showRegulonRings,
  onSelect,
}: {
  nodes: Gene[];
  edges: VisualEdge[];
  groups: LandscapeGroup[];
  groupMode: ColorMode;
  ageIndex: number;
  selected: string;
  tomMedian: number;
  tomP95: number;
  gnnMedian: number;
  gnnP95: number;
  colorMode: ColorMode;
  showRegulonRings: boolean;
  onSelect: (gene: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<{ g: string; x: number; y: number; radius: number }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const keyboardNodes = useMemo(() => nodes.map((gene) => gene.g), [nodes]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const width = rect.width;
      const height = rect.height;
      context.clearRect(0, 0, width, height);

      const activeGroups = groups.filter((group) => nodes.some((gene) =>
        groupMode === "module" ? gene.module === group.id : gene.program === group.id));
      const compact = width < 720;
      const anchors = groupMode === "module"
        ? compact
          ? [[0.28, 0.13], [0.72, 0.30], [0.28, 0.47], [0.72, 0.64], [0.50, 0.84]]
          : [[0.19, 0.31], [0.50, 0.23], [0.80, 0.34], [0.34, 0.72], [0.69, 0.73]]
        : compact
          ? [[0.28, 0.11], [0.72, 0.24], [0.28, 0.39], [0.72, 0.54], [0.28, 0.69], [0.72, 0.84]]
          : [[0.17, 0.29], [0.50, 0.21], [0.83, 0.29], [0.17, 0.71], [0.50, 0.79], [0.83, 0.71]];
      const positions = new Map<string, { x: number; y: number; radius: number; angle: number }>();

      activeGroups.forEach((group, groupIndex) => {
        const order = new Map(group.order.map((geneName, index) => [geneName, index]));
        const groupGenes = nodes
          .filter((gene) => groupMode === "module" ? gene.module === group.id : gene.program === group.id)
          .sort((a, b) => (order.get(a.g) ?? 999) - (order.get(b.g) ?? 999) || a.g.localeCompare(b.g));
        const [anchorX, anchorY] = anchors[groupIndex] || [0.5, 0.5];
        const cx = anchorX * width;
        const cy = anchorY * height;
        const color = group.color;
        const glow = context.createRadialGradient(cx, cy, 8, cx, cy, Math.min(width * 0.13, 170));
        glow.addColorStop(0, `${color}24`);
        glow.addColorStop(0.58, `${color}0b`);
        glow.addColorStop(1, `${color}00`);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(cx, cy, Math.min(width * 0.13, 170), 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `${color}cc`;
        context.font = "700 10px Inter, ui-sans-serif, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          `${displayModule(group.id)} · ${groupGenes.length} SHOWN / ${group.genes} TOTAL`,
          cx,
          cy - (compact ? 58 : Math.min(height * 0.14, 104)),
        );

        const radiusX = compact ? Math.min(Math.max(width * 0.1, 34), 48) : Math.min(Math.max(width * 0.07, 62), 104);
        const radiusY = compact ? 42 : Math.min(Math.max(height * 0.105, 62), 84);
        groupGenes.forEach((gene, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(groupGenes.length, 1) + groupIndex * 0.19;
          const rank = index + 1;
          const nodeRadius = Math.max(8, 17 - (rank - 1) * 0.3);
          positions.set(gene.g, {
            x: cx + Math.cos(angle) * radiusX,
            y: cy + Math.sin(angle) * radiusY,
            radius: nodeRadius,
            angle,
          });
        });
      });

      edges.forEach((edge) => {
        const from = positions.get(edge.source);
        const to = positions.get(edge.target);
        if (!from || !to) return;
        const tier = edgeStrength(edge, tomMedian, tomP95, ageIndex, gnnMedian, gnnP95);
        const emphasized = hovered ? edge.source === hovered || edge.target === hovered : edge.source === selected || edge.target === selected;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.max(Math.hypot(dx, dy), 1);
        const seed = [...edge.source, ...edge.target].reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const evidenceOffset = edge.kind === "hdwgcna" ? -5 : edge.kind === "scenic" ? 5 : 0;
        const bend = ((seed % 7) - 3) * Math.min(distance * 0.018, 5) + evidenceOffset;
        const controlX = (from.x + to.x) / 2 - (dy / distance) * bend;
        const controlY = (from.y + to.y) / 2 + (dx / distance) * bend;

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.quadraticCurveTo(controlX, controlY, to.x, to.y);
        applyStrengthStyle(context, tier);
        if (emphasized) context.globalAlpha = 1;
        if (edge.kind === "hdwgcna") {
          context.strokeStyle = "#43d8c1";
        } else if (edge.kind === "gnn") {
          context.strokeStyle = (edge.corr?.[ageIndex] || 0) >= 0 ? "#66b8ff" : "#f2aa69";
        } else {
          context.strokeStyle = "#ff4f64";
        }
        context.stroke();

        if (edge.kind === "scenic") {
          const angle = Math.atan2(to.y - controlY, to.x - controlX);
          const arrowX = to.x - Math.cos(angle) * (to.radius + 4);
          const arrowY = to.y - Math.sin(angle) * (to.radius + 4);
          const size = tier === "strong" ? 7 : tier === "medium" ? 5.5 : 4;
          context.setLineDash([]);
          context.beginPath();
          context.moveTo(arrowX, arrowY);
          context.lineTo(arrowX - Math.cos(angle - 0.55) * size, arrowY - Math.sin(angle - 0.55) * size);
          context.lineTo(arrowX - Math.cos(angle + 0.55) * size, arrowY - Math.sin(angle + 0.55) * size);
          context.closePath();
          context.fillStyle = "#ff4f64";
          context.fill();
        }
      });
      context.setLineDash([]);
      context.globalAlpha = 1;

      const hitNodes: { g: string; x: number; y: number; radius: number }[] = [];
      positions.forEach((position, geneName) => {
        const gene = nodes.find((item) => item.g === geneName);
        if (!gene) return;
        const active = geneName === selected;
        const isHovered = geneName === hovered;
        const radius = position.radius + (isHovered ? 2 : 0);
        const color = colorFor(gene, colorMode);

        if (active || isHovered) {
          context.beginPath();
          context.arc(position.x, position.y, radius + 8, 0, Math.PI * 2);
          context.fillStyle = active ? `${color}33` : "rgba(255,255,255,.08)";
          context.fill();
        }
        context.beginPath();
        context.arc(position.x, position.y, radius + 3, 0, Math.PI * 2);
        context.strokeStyle = showRegulonRings && gene.isRegulon ? "#ff4f64" : `${color}70`;
        context.lineWidth = showRegulonRings && gene.isRegulon ? 2 : 1;
        context.stroke();
        context.beginPath();
        context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        context.fillStyle = color;
        context.fill();
        context.strokeStyle = active ? "#ffffff" : "rgba(255,255,255,.5)";
        context.lineWidth = active ? 2.8 : 1;
        context.stroke();

        const outward = Math.cos(position.angle);
        context.fillStyle = active || isHovered ? "#ffffff" : "#c8d5d8";
        context.font = `${active || isHovered ? 700 : 600} ${active || isHovered ? 11 : 9.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textAlign = outward > 0.28 ? "left" : outward < -0.28 ? "right" : "center";
        context.textBaseline = Math.sin(position.angle) > 0.45 ? "top" : Math.sin(position.angle) < -0.45 ? "bottom" : "middle";
        const labelX = position.x + Math.cos(position.angle) * (radius + 8);
        const labelY = position.y + Math.sin(position.angle) * (radius + 8);
        context.fillText(geneName.length > 18 ? `${geneName.slice(0, 16)}…` : geneName, labelX, labelY);
        hitNodes.push({ g: geneName, x: position.x, y: position.y, radius: radius + 9 });
      });
      nodesRef.current = hitNodes;
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [nodes, edges, groups, groupMode, ageIndex, selected, tomMedian, tomP95, gnnMedian, gnnP95, colorMode, showRegulonRings, hovered]);

  const hit = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return nodesRef.current.find((node) => Math.hypot(node.x - x, node.y - y) <= node.radius)?.g || null;
  };

  return (
    <div className="hub-landscape-canvas-wrap">
      <canvas
        ref={ref}
        role="group"
        tabIndex={0}
        aria-label={`Interactive overview of core genes grouped into ${groups.length} ${groupMode === "module" ? "hdWGCNA modules" : "GNN programs"}. Use left and right arrow keys to move between genes, then Enter to select.`}
        onFocus={() => {
          if (!hovered && keyboardNodes.length) {
            setHovered(keyboardNodes.includes(selected) ? selected : keyboardNodes[0]);
          }
        }}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) => {
          if (!keyboardNodes.length) return;
          if (event.key === "Enter" || event.key === " ") {
            if (hovered) onSelect(hovered);
            event.preventDefault();
            return;
          }
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          const current = Math.max(0, keyboardNodes.indexOf(hovered || selected));
          const next = event.key === "Home"
            ? 0
            : event.key === "End"
              ? keyboardNodes.length - 1
              : (current + (event.key === "ArrowRight" ? 1 : -1) + keyboardNodes.length) % keyboardNodes.length;
          setHovered(keyboardNodes[next]);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const geneName = hit(event);
          event.currentTarget.style.cursor = geneName ? "pointer" : "default";
          setHovered(geneName);
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(event) => {
          const geneName = hit(event);
          if (geneName) onSelect(geneName);
        }}
      />
      <div className="canvas-note">Click a hub, or use ← / → + Enter · larger nodes rank higher</div>
    </div>
  );
}

function UmapCanvas({ genes, projection, colorMode, onSelect }: { genes: Gene[]; projection: "hdwgcna" | "gnn"; colorMode: ColorMode; onSelect: (gene: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ g: string; x: number; y: number; gene: Gene }[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const redrawRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const coordinate = (gene: Gene) => projection === "gnn" ? gene.gnnUmap : gene.hdUmap;
    const positioned = genes.filter((gene) => coordinate(gene));
    if (!positioned.length) return;
    const xs = positioned.map((gene) => coordinate(gene)![0]);
    const ys = positioned.map((gene) => coordinate(gene)![1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const draw = (resizeCanvas: boolean) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (resizeCanvas) {
        canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      const points = positioned.map((gene) => ({
        g: gene.g,
        gene,
        x: 28 + ((coordinate(gene)![0] - minX) / (maxX - minX || 1)) * (rect.width - 56),
        y: rect.height - 28 - ((coordinate(gene)![1] - minY) / (maxY - minY || 1)) * (rect.height - 56),
      }));
      points.forEach((point) => {
        const active = point.g === hoveredRef.current;
        context.beginPath();
        context.arc(point.x, point.y, active ? 7 : 2.8, 0, Math.PI * 2);
        context.fillStyle = colorFor(point.gene, colorMode);
        context.globalAlpha = active ? 1 : 0.72;
        context.fill();
        if (active) {
          context.fillStyle = "#ffffff";
          context.font = "600 12px ui-monospace, monospace";
          context.textAlign = "left";
          context.fillText(point.g, point.x + 10, point.y - 8);
        }
      });
      context.globalAlpha = 1;
      pointsRef.current = points;
    };
    redrawRef.current = () => draw(false);
    draw(true);
    const observer = new ResizeObserver(() => draw(true));
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      redrawRef.current = () => undefined;
    };
  }, [genes, projection, colorMode]);

  const setHovered = (gene: string | null) => {
    if (hoveredRef.current === gene) return;
    hoveredRef.current = gene;
    redrawRef.current();
  };

  const hit = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let bestGene: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const point of pointsRef.current) {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < 9 && distance < bestDistance) {
        bestGene = point.g;
        bestDistance = distance;
      }
    }
    return bestGene;
  };

  return (
    <canvas
      ref={ref}
      className="umap-canvas"
      role="group"
      tabIndex={0}
      aria-label={`${projection === "gnn" ? "GNN consensus" : "hdWGCNA supervised gene network"} UMAP. Use left and right arrow keys to move between genes, Page Up and Page Down to jump, then Enter to select.`}
      onFocus={() => {
        if (!hoveredRef.current && pointsRef.current.length) setHovered(pointsRef.current[0].g);
      }}
      onBlur={() => setHovered(null)}
      onKeyDown={(event) => {
        const points = pointsRef.current;
        if (!points.length) return;
        const current = Math.max(0, points.findIndex((point) => point.g === hoveredRef.current));
        if (event.key === "Enter" || event.key === " ") {
          if (hoveredRef.current) onSelect(hoveredRef.current);
          event.preventDefault();
          return;
        }
        if (!["ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
        const step = event.key === "PageDown" ? 20 : event.key === "PageUp" ? -20 : event.key === "ArrowRight" ? 1 : -1;
        const next = event.key === "Home"
          ? 0
          : event.key === "End"
            ? points.length - 1
            : (current + step + points.length) % points.length;
        setHovered(points[next].g);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        const gene = hit(event);
        event.currentTarget.style.cursor = gene ? "pointer" : "crosshair";
        setHovered(gene);
      }}
      onPointerLeave={() => setHovered(null)}
      onClick={(event) => {
        const gene = hit(event);
        if (gene) onSelect(gene);
      }}
    />
  );
}

function AgeTrajectoryCanvas({ genes, onSelect }: { genes: Gene[]; onSelect: (gene: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ g: string; x: number; y: number }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const keyboardGenes = useMemo(
    () => genes.filter((gene) => gene.ageUmap?.every(Boolean)).map((gene) => gene.g),
    [genes],
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const positioned = genes.filter((gene) => gene.ageUmap?.every(Boolean));
    const allPoints = positioned.flatMap((gene) => gene.ageUmap!.filter((point): point is Point => Boolean(point)));
    if (!allPoints.length) return;
    const xs = allPoints.map((point) => point[0]);
    const ys = allPoints.map((point) => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const maxDisplacement = Math.max(...positioned.map((gene) => gene.displacement?.[2] || 0), 0.001);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      context.fillStyle = "rgba(255,255,255,.035)";
      for (let x = 24; x < rect.width; x += 28) {
        for (let y = 24; y < rect.height; y += 28) {
          context.beginPath();
          context.arc(x, y, 0.7, 0, Math.PI * 2);
          context.fill();
        }
      }

      const scale = (point: Point) => ({
        x: 34 + ((point[0] - minX) / (maxX - minX || 1)) * (rect.width - 68),
        y: rect.height - 34 - ((point[1] - minY) / (maxY - minY || 1)) * (rect.height - 68),
      });
      const hitPoints: { g: string; x: number; y: number }[] = [];
      positioned.forEach((gene) => {
        const points = gene.ageUmap!.map((point) => scale(point!));
        const active = hovered === gene.g;
        const color = colorFor(gene, "program");
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        context.lineTo(points[1].x, points[1].y);
        context.lineTo(points[2].x, points[2].y);
        context.strokeStyle = color;
        context.globalAlpha = active ? 1 : 0.52;
        context.lineWidth = active ? 4 : 0.9 + ((gene.displacement?.[2] || 0) / maxDisplacement) * 2.1;
        context.setLineDash(active ? [] : [5, 4]);
        context.stroke();
        context.setLineDash([]);

        points.forEach((point, index) => {
          const radius = active ? 7 : index === 1 ? 4 : 5;
          context.beginPath();
          if (index === 2) {
            context.moveTo(point.x, point.y - radius);
            context.lineTo(point.x + radius, point.y);
            context.lineTo(point.x, point.y + radius);
            context.lineTo(point.x - radius, point.y);
            context.closePath();
          } else {
            context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          }
          context.fillStyle = index === 0 ? "#0b1518" : color;
          context.fill();
          context.strokeStyle = color;
          context.lineWidth = index === 0 ? 2 : 1;
          context.stroke();
          hitPoints.push({ g: gene.g, x: point.x, y: point.y });
        });
        if (active) {
          const point = points[2];
          context.globalAlpha = 1;
          context.fillStyle = "#fff";
          context.font = "700 12px ui-monospace, monospace";
          context.textAlign = "left";
          context.fillText(`${gene.g} · ${gene.program}`, point.x + 10, point.y - 8);
        }
      });
      context.globalAlpha = 1;
      pointsRef.current = hitPoints;
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [genes, hovered]);

  const hit = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return pointsRef.current
      .map((point) => ({ ...point, distance: Math.hypot(point.x - x, point.y - y) }))
      .filter((point) => point.distance < 10)
      .sort((a, b) => a.distance - b.distance)[0]?.g || null;
  };

  return (
    <div className="trajectory-canvas-wrap">
      <canvas
        ref={ref}
        role="group"
        tabIndex={0}
        aria-label="Age-snapshot GNN embedding trajectories for high-displacement genes. Use left and right arrow keys to move between genes, then Enter to select."
        onFocus={() => {
          if (!hovered && keyboardGenes.length) setHovered(keyboardGenes[0]);
        }}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) => {
          if (!keyboardGenes.length) return;
          if (event.key === "Enter" || event.key === " ") {
            if (hovered) onSelect(hovered);
            event.preventDefault();
            return;
          }
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          const current = Math.max(0, keyboardGenes.indexOf(hovered || keyboardGenes[0]));
          const next = event.key === "Home"
            ? 0
            : event.key === "End"
              ? keyboardGenes.length - 1
              : (current + (event.key === "ArrowRight" ? 1 : -1) + keyboardGenes.length) % keyboardGenes.length;
          setHovered(keyboardGenes[next]);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          const gene = hit(event);
          event.currentTarget.style.cursor = gene ? "pointer" : "crosshair";
          setHovered(gene);
        }}
        onPointerLeave={() => setHovered(null)}
        onClick={(event) => {
          const gene = hit(event);
          if (gene) onSelect(gene);
        }}
      />
      <div className="trajectory-key"><span><i className="start" />D0</span><span><i className="middle" />D25</span><span><i className="end" />D50</span></div>
    </div>
  );
}

function workspaceStrength(
  edge: VisualEdge,
  ageIndex: number,
  tomThreshold: number,
  tomP95: number,
) {
  if (edge.kind === "gnn") {
    return clamp(
      (Math.abs(edge.corr?.[ageIndex] || 0) - 0.05) / (GNN_PROXIMITY_CEILING - 0.05),
      0.02,
      1,
    );
  }
  if (edge.kind === "hdwgcna") {
    return clamp(((edge.tom || tomThreshold) - tomThreshold) / Math.max(tomP95 - tomThreshold, 0.01), 0.04, 1);
  }
  return clamp(edge.percentile || 0.05, 0.05, 1);
}

function WorkspaceNetworkCanvas({
  seeds,
  edges,
  genes,
  ageIndex,
  tomThreshold,
  tomP95,
  colorMode,
  showRegulonRings,
  onPromote,
}: {
  seeds: string[];
  edges: VisualEdge[];
  genes: Map<string, Gene>;
  ageIndex: number;
  tomThreshold: number;
  tomP95: number;
  colorMode: ColorMode;
  showRegulonRings: boolean;
  onPromote: (gene: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ g: string; x: number; y: number; radius: number }[]>([]);
  const drawRef = useRef<(() => void) | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 });
  const [labelMode, setLabelMode] = useState<"smart" | "all">("smart");
  const hoveredRef = useRef(hovered);
  const viewportRef = useRef(viewport);
  const labelModeRef = useRef(labelMode);
  const nodeNames = useMemo(
    () => Array.from(new Set([...seeds, ...edges.flatMap((edge) => [edge.source, edge.target])])),
    [seeds, edges],
  );

  const zoomAt = (factor: number, anchor?: { x: number; y: number }) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const anchorX = anchor?.x ?? centerX;
    const anchorY = anchor?.y ?? centerY;
    setViewport((current) => {
      const nextZoom = clamp(current.zoom * factor, 0.65, 3.5);
      const ratio = nextZoom / current.zoom;
      return {
        zoom: nextZoom,
        panX: anchorX - centerX - (anchorX - centerX - current.panX) * ratio,
        panY: anchorY - centerY - (anchorY - centerY - current.panY) * ratio,
      };
    });
  };
  const fitGraph = () => setViewport({ zoom: 1, panX: 0, panY: 0 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const activeViewport = viewportRef.current;
      const activeHovered = hoveredRef.current;
      const activeLabelMode = labelModeRef.current;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const proximityStrength = (relevant: VisualEdge[]) => {
        const ageSpecific = relevant.filter((edge) => edge.kind === "gnn");
        const basis = ageSpecific.length ? ageSpecific : relevant;
        return basis.length
          ? Math.max(...basis.map((edge) => workspaceStrength(edge, ageIndex, tomThreshold, tomP95)))
          : 0;
      };
      const pairStrength = (a: string, b: string) => {
        const relevant = edges.filter((edge) =>
          (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a));
        return proximityStrength(relevant);
      };
      const pairDistance = (a: string, b: string) => 72 + (1 - pairStrength(a, b)) * 96;
      const seedPositions = new Map<string, { x: number; y: number }>();

      if (seeds.length === 1) {
        seedPositions.set(seeds[0], { x: centerX, y: centerY });
      } else if (seeds.length === 2) {
        const distance = pairDistance(seeds[0], seeds[1]);
        seedPositions.set(seeds[0], { x: centerX - distance / 2, y: centerY });
        seedPositions.set(seeds[1], { x: centerX + distance / 2, y: centerY });
      } else {
        const side01 = pairDistance(seeds[0], seeds[1]);
        const side02 = pairDistance(seeds[0], seeds[2]);
        const raw12 = pairDistance(seeds[1], seeds[2]);
        const side12 = clamp(raw12, Math.abs(side01 - side02) + 26, side01 + side02 - 26);
        const x2 = (side01 ** 2 + side02 ** 2 - side12 ** 2) / (2 * side01);
        const y2 = Math.sqrt(Math.max(side02 ** 2 - x2 ** 2, 900));
        const raw = [{ x: 0, y: 0 }, { x: side01, y: 0 }, { x: x2, y: y2 }];
        const centroid = {
          x: raw.reduce((sum, point) => sum + point.x, 0) / 3,
          y: raw.reduce((sum, point) => sum + point.y, 0) / 3,
        };
        raw.forEach((point, index) => {
          seedPositions.set(seeds[index], {
            x: centerX + point.x - centroid.x,
            y: centerY + point.y - centroid.y,
          });
        });
      }

      const positions = new Map(seedPositions);
      const neighborGroups = new Map<string, { g: string; strength: number; shared: boolean }[]>();
      seeds.forEach((seed) => neighborGroups.set(seed, []));
      nodeNames.filter((name) => !seedPositions.has(name)).forEach((name) => {
        const incident = seeds
          .map((seed) => {
            const relevant = edges.filter((edge) =>
              (edge.source === seed && edge.target === name) || (edge.source === name && edge.target === seed));
            return {
              seed,
              strength: proximityStrength(relevant),
            };
          })
          .filter((item) => item.strength > 0)
          .sort((a, b) => b.strength - a.strength);
        const owner = incident[0]?.seed || seeds[0];
        neighborGroups.get(owner)?.push({ g: name, strength: incident[0]?.strength || 0.05, shared: incident.length > 1 });
      });

      const maximumRadius = Math.max(105, Math.min(rect.width * 0.29, rect.height * 0.34));
      neighborGroups.forEach((neighbors, seed) => {
        const origin = seedPositions.get(seed) || { x: centerX, y: centerY };
        const outward = seeds.length === 1 ? -Math.PI / 2 : Math.atan2(origin.y - centerY, origin.x - centerX);
        neighbors.sort((a, b) => b.strength - a.strength || a.g.localeCompare(b.g));
        neighbors.forEach((neighbor, index) => {
          const angle = seeds.length === 1
            ? -Math.PI / 2 + index * 2.399963
            : outward + (neighbors.length === 1 ? 0 : (index / (neighbors.length - 1) - 0.5) * 2.35);
          const distance = 66 + (1 - neighbor.strength) * (maximumRadius - 66);
          positions.set(neighbor.g, {
            x: clamp(origin.x + Math.cos(angle) * distance, 34, rect.width - 34),
            y: clamp(origin.y + Math.sin(angle) * distance, 40, rect.height - 40),
          });
        });
      });

      const project = (point: { x: number; y: number }) => ({
        x: centerX + (point.x - centerX) * activeViewport.zoom + activeViewport.panX,
        y: centerY + (point.y - centerY) * activeViewport.zoom + activeViewport.panY,
      });
      const screenPositions = new Map(
        Array.from(positions, ([name, point]) => [name, project(point)]),
      );
      const screenSeedPositions = new Map(
        Array.from(seedPositions, ([name, point]) => [name, project(point)]),
      );

      context.fillStyle = "rgba(255,255,255,.035)";
      for (let x = 24; x < rect.width; x += 30) {
        for (let y = 24; y < rect.height; y += 30) {
          context.beginPath();
          context.arc(x, y, 0.7, 0, Math.PI * 2);
          context.fill();
        }
      }

      screenSeedPositions.forEach((point) => {
        [72, maximumRadius].forEach((radius, index) => {
          context.beginPath();
          context.arc(point.x, point.y, radius * activeViewport.zoom, 0, Math.PI * 2);
          context.strokeStyle = index === 0 ? "rgba(116,225,207,.10)" : "rgba(255,255,255,.035)";
          context.lineWidth = 1;
          context.setLineDash(index === 0 ? [4, 7] : [2, 10]);
          context.stroke();
        });
      });
      context.setLineDash([]);

      const nodeRadius = (name: string) => seeds.includes(name)
        ? 21
        : showRegulonRings && genes.get(name)?.isRegulon
          ? 12
          : 9;
      const orderedEdges = [...edges].sort((a, b) => {
        const order = { hdwgcna: 0, gnn: 1, scenic: 2 };
        return order[a.kind] - order[b.kind];
      });
      orderedEdges.forEach((edge) => {
        const source = screenPositions.get(edge.source);
        const target = screenPositions.get(edge.target);
        if (!source || !target) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.max(Math.hypot(dx, dy), 1);
        const ux = dx / length;
        const uy = dy / length;
        const nx = -uy;
        const ny = ux;
        const offset = edge.kind === "hdwgcna" ? -3.5 : edge.kind === "scenic" ? 3.5 : 0;
        const startRadius = nodeRadius(edge.source) + 3;
        const endRadius = nodeRadius(edge.target) + (edge.kind === "scenic" ? 9 : 3);
        const x1 = source.x + ux * startRadius + nx * offset;
        const y1 = source.y + uy * startRadius + ny * offset;
        const x2 = target.x - ux * endRadius + nx * offset;
        const y2 = target.y - uy * endRadius + ny * offset;
        const strength = workspaceStrength(edge, ageIndex, tomThreshold, tomP95);

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        if (edge.kind === "scenic") {
          context.strokeStyle = "#ff4f64";
          context.lineWidth = 1.3 + strength * 3.6;
          context.globalAlpha = 0.55 + strength * 0.42;
          context.setLineDash([]);
        } else if (edge.kind === "gnn") {
          context.strokeStyle = (edge.corr?.[ageIndex] || 0) < 0 ? "#f2a35e" : "#6ab8ff";
          context.lineWidth = 0.8 + strength * 3.1;
          context.globalAlpha = edge.present?.[ageIndex] ? 0.82 : 0.28;
          context.setLineDash(edge.present?.[ageIndex] ? [] : [5, 6]);
        } else {
          context.strokeStyle = "#4ad4bd";
          context.lineWidth = 0.7 + strength * 2.2;
          context.globalAlpha = 0.34 + strength * 0.36;
          context.setLineDash([2, 5]);
        }
        context.stroke();
        context.setLineDash([]);

        if (edge.kind === "scenic") {
          context.beginPath();
          context.moveTo(x2, y2);
          context.lineTo(x2 - ux * 12 + nx * 6, y2 - uy * 12 + ny * 6);
          context.lineTo(x2 - ux * 12 - nx * 6, y2 - uy * 12 - ny * 6);
          context.closePath();
          context.fillStyle = "#ff4f64";
          context.fill();
        }
      });
      context.globalAlpha = 1;

      const hitPoints: { g: string; x: number; y: number; radius: number }[] = [];
      const strongestIncident = new Map<string, number>();
      edges.forEach((edge) => {
        const strength = workspaceStrength(edge, ageIndex, tomThreshold, tomP95);
        strongestIncident.set(edge.source, Math.max(strongestIncident.get(edge.source) || 0, strength));
        strongestIncident.set(edge.target, Math.max(strongestIncident.get(edge.target) || 0, strength));
      });
      const renderedNodes: {
        name: string;
        point: { x: number; y: number };
        gene: Gene;
        isSeed: boolean;
        isHovered: boolean;
        radius: number;
        sharedCenters: number;
        strength: number;
      }[] = [];
      nodeNames.forEach((name) => {
        const point = screenPositions.get(name);
        const gene = genes.get(name);
        if (!point || !gene) return;
        const isSeed = seeds.includes(name);
        const isHovered = activeHovered === name;
        const radius = nodeRadius(name) + (isHovered ? 2 : 0);
        if (point.x + radius < 0 || point.x - radius > rect.width || point.y + radius < 0 || point.y - radius > rect.height) {
          return;
        }
        if (isSeed || isHovered) {
          context.beginPath();
          context.arc(point.x, point.y, radius + 8, 0, Math.PI * 2);
          context.fillStyle = isSeed ? "rgba(255,255,255,.075)" : "rgba(255,255,255,.045)";
          context.fill();
        }
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = colorFor(gene, colorMode);
        context.fill();
        context.strokeStyle = showRegulonRings && gene.isRegulon ? "#ff596b" : isSeed ? "#ffffff" : "rgba(255,255,255,.55)";
        context.lineWidth = showRegulonRings && gene.isRegulon ? 2.8 : isSeed ? 2.4 : 1;
        context.stroke();
        const sharedCenters = seeds.filter((seed) => edges.some((edge) =>
          (edge.source === seed && edge.target === name) || (edge.source === name && edge.target === seed))).length;
        renderedNodes.push({
          name,
          point,
          gene,
          isSeed,
          isHovered,
          radius,
          sharedCenters,
          strength: strongestIncident.get(name) || 0,
        });
        hitPoints.push({ g: name, x: point.x, y: point.y, radius: radius + 10 });
      });

      type LabelBox = { left: number; top: number; right: number; bottom: number };
      const overlaps = (left: LabelBox, right: LabelBox) =>
        left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
      const reserved: LabelBox[] = [
        { left: Math.max(0, rect.width - 285), top: 8, right: rect.width - 8, bottom: 62 },
        { left: 8, top: Math.max(0, rect.height - 90), right: Math.min(320, rect.width - 8), bottom: rect.height - 8 },
      ];
      const occupied: LabelBox[] = [];
      const seedRank = new Map(seeds.map((name, index) => [name, index]));
      const labelCandidates = [...renderedNodes].sort((left, right) =>
        Number(right.isHovered) - Number(left.isHovered)
        || Number(right.isSeed) - Number(left.isSeed)
        || (seedRank.get(left.name) ?? 999) - (seedRank.get(right.name) ?? 999)
        || Number(showRegulonRings && right.gene.isRegulon) - Number(showRegulonRings && left.gene.isRegulon)
        || right.sharedCenters - left.sharedCenters
        || right.strength - left.strength
        || left.name.localeCompare(right.name));
      const smartLimit = activeViewport.zoom < 0.75
        ? seeds.length + 1
        : activeViewport.zoom < 1.05
          ? 18
          : activeViewport.zoom < 1.5
            ? 34
            : activeViewport.zoom < 2.2
              ? 64
              : nodeNames.length;
      let optionalLabels = 0;

      labelCandidates.forEach((node) => {
        const mandatory = node.isSeed || node.isHovered;
        if (activeLabelMode === "smart" && !mandatory && optionalLabels >= smartLimit) return;
        if (activeLabelMode === "smart" && activeViewport.zoom < 0.75 && !mandatory) return;

        const label = node.name.length > 18 ? `${node.name.slice(0, 16)}…` : node.name;
        const fontSize = node.isSeed ? 12 : node.isHovered ? 11 : 9.5;
        context.font = `${node.isSeed ? 700 : 600} ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const width = context.measureText(label).width + 9;
        const height = fontSize + 7;
        const gap = 6;
        const horizontal = node.radius + gap + width / 2;
        const vertical = node.radius + gap + height / 2;
        const placements = [
          { x: node.point.x, y: node.point.y - vertical },
          { x: node.point.x + horizontal, y: node.point.y },
          { x: node.point.x, y: node.point.y + vertical },
          { x: node.point.x - horizontal, y: node.point.y },
          { x: node.point.x + horizontal, y: node.point.y - vertical },
          { x: node.point.x - horizontal, y: node.point.y - vertical },
          { x: node.point.x + horizontal, y: node.point.y + vertical },
          { x: node.point.x - horizontal, y: node.point.y + vertical },
        ].map((placement) => ({
          ...placement,
          box: {
            left: placement.x - width / 2,
            top: placement.y - height / 2,
            right: placement.x + width / 2,
            bottom: placement.y + height / 2,
          },
        }));
        const collisionCount = (candidate: { box: LabelBox }) => {
          let collisions = occupied.filter((box) => overlaps(candidate.box, box)).length;
          collisions += reserved.filter((box) => overlaps(candidate.box, box)).length;
          collisions += renderedNodes.filter((other) => {
            if (other.name === node.name) return false;
            const closestX = clamp(other.point.x, candidate.box.left, candidate.box.right);
            const closestY = clamp(other.point.y, candidate.box.top, candidate.box.bottom);
            return Math.hypot(other.point.x - closestX, other.point.y - closestY) < other.radius + 3;
          }).length;
          if (candidate.box.left < 4 || candidate.box.right > rect.width - 4 || candidate.box.top < 4 || candidate.box.bottom > rect.height - 4) {
            collisions += 10;
          }
          return collisions;
        };
        const rankedPlacements = placements
          .map((placement, index) => ({ ...placement, index, collisions: collisionCount(placement) }))
          .sort((left, right) => left.collisions - right.collisions || left.index - right.index);
        const chosen = rankedPlacements.find((placement) => placement.collisions === 0)
          || (mandatory || activeLabelMode === "all" ? rankedPlacements[0] : null);
        if (!chosen) return;

        occupied.push(chosen.box);
        if (!mandatory) optionalLabels += 1;
        context.font = `${node.isSeed ? 700 : 600} ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineWidth = node.isSeed || node.isHovered ? 5 : 4;
        context.strokeStyle = "rgba(5,13,16,.96)";
        context.strokeText(label, chosen.x, chosen.y);
        context.fillStyle = node.isHovered ? "#ffffff" : "#f4fafb";
        context.fillText(label, chosen.x, chosen.y);
      });
      pointsRef.current = hitPoints;
    };

    drawRef.current = draw;
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      if (drawRef.current === draw) drawRef.current = null;
    };
  }, [seeds, edges, genes, ageIndex, tomThreshold, tomP95, colorMode, showRegulonRings, nodeNames]);

  useEffect(() => {
    hoveredRef.current = hovered;
    viewportRef.current = viewport;
    labelModeRef.current = labelMode;
    const frame = requestAnimationFrame(() => drawRef.current?.());
    return () => cancelAnimationFrame(frame);
  }, [hovered, viewport, labelMode]);

  const hit = (event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return pointsRef.current
      .map((point) => ({ ...point, distance: Math.hypot(point.x - x, point.y - y) }))
      .filter((point) => point.distance <= point.radius)
      .sort((a, b) => a.distance - b.distance)[0]?.g || null;
  };
  const hoveredGene = hovered ? genes.get(hovered) : null;

  return (
    <div className="workspace-canvas-wrap">
      <canvas
        ref={ref}
        role="group"
        tabIndex={0}
        aria-label={`Zoomable age-aware network for ${seeds.join(", ")} at ${AGES[ageIndex]}. Stronger relationships are drawn closer. Red arrows point from SCENIC TFs to targets.`}
        aria-describedby="workspace-canvas-instructions"
        onFocus={() => { if (!hovered && nodeNames.length) setHovered(nodeNames[0]); }}
        onBlur={() => setHovered(null)}
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            zoomAt(1.25);
            event.preventDefault();
            return;
          }
          if (event.key === "-" || event.key === "_") {
            zoomAt(0.8);
            event.preventDefault();
            return;
          }
          if (event.key === "0" || event.key.toLowerCase() === "f") {
            fitGraph();
            event.preventDefault();
            return;
          }
          if (event.shiftKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
            const step = 36;
            setViewport((current) => ({
              ...current,
              panX: current.panX + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
              panY: current.panY + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
            }));
            event.preventDefault();
            return;
          }
          if (!nodeNames.length) return;
          if (event.key === "Enter" || event.key === " ") {
            if (hovered) onPromote(hovered);
            event.preventDefault();
            return;
          }
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          if (event.key === "Home" || event.key === "End") {
            setHovered(nodeNames[event.key === "Home" ? 0 : nodeNames.length - 1]);
            event.preventDefault();
            return;
          }
          const currentPoint = pointsRef.current.find((point) => point.g === (hovered || nodeNames[0]));
          const direction = event.key === "ArrowLeft"
            ? { x: -1, y: 0 }
            : event.key === "ArrowUp"
              ? { x: 0, y: -1 }
              : event.key === "ArrowDown"
                ? { x: 0, y: 1 }
                : { x: 1, y: 0 };
          const candidates = currentPoint
            ? pointsRef.current
              .filter((point) =>
                (point.x - currentPoint.x) * direction.x + (point.y - currentPoint.y) * direction.y > 1)
              .map((point) => ({
                point,
                score: Math.hypot(point.x - currentPoint.x, point.y - currentPoint.y)
                  + Math.abs(
                    (point.x - currentPoint.x) * direction.y
                    - (point.y - currentPoint.y) * direction.x,
                  ) * 1.8,
              }))
              .sort((left, right) => left.score - right.score)
            : [];
          const fallbackIndex = Math.max(0, nodeNames.indexOf(hovered || nodeNames[0]));
          const fallbackStep = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
          setHovered(candidates[0]?.point.g || nodeNames[(fallbackIndex + fallbackStep + nodeNames.length) % nodeNames.length]);
          event.preventDefault();
        }}
        onWheel={(event) => {
          if (!(event.ctrlKey || event.metaKey || document.activeElement === event.currentTarget)) return;
          const rect = event.currentTarget.getBoundingClientRect();
          zoomAt(Math.exp(-event.deltaY * 0.0015), {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            panX: viewport.panX,
            panY: viewport.panY,
            moved: false,
          };
          event.currentTarget.dataset.dragging = "false";
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (drag?.pointerId === event.pointerId) {
            const deltaX = event.clientX - drag.startX;
            const deltaY = event.clientY - drag.startY;
            if (!drag.moved && Math.hypot(deltaX, deltaY) >= 4) drag.moved = true;
            if (drag.moved) {
              const rect = event.currentTarget.getBoundingClientRect();
              setViewport((current) => ({
                ...current,
                panX: clamp(drag.panX + deltaX, -rect.width * 1.8, rect.width * 1.8),
                panY: clamp(drag.panY + deltaY, -rect.height * 1.8, rect.height * 1.8),
              }));
              event.currentTarget.dataset.dragging = "true";
              event.currentTarget.dataset.nodeHover = "false";
              return;
            }
          }
          const geneName = hit(event);
          event.currentTarget.dataset.nodeHover = geneName ? "true" : "false";
          setHovered(geneName);
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (!drag.moved) {
            const geneName = hit(event);
            if (geneName) onPromote(geneName);
          }
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          event.currentTarget.dataset.dragging = "false";
          event.currentTarget.dataset.nodeHover = hit(event) ? "true" : "false";
        }}
        onPointerCancel={(event) => {
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          event.currentTarget.dataset.dragging = "false";
          event.currentTarget.dataset.nodeHover = "false";
        }}
        onPointerLeave={() => {
          if (!dragRef.current) setHovered(null);
        }}
      />
      <p id="workspace-canvas-instructions" className="sr-only">
        Drag to pan. Use the zoom buttons, or focus the graph and use the mouse wheel, plus and minus keys. Press zero or F to fit the graph. Arrow keys move between visible genes; Enter selects one.
      </p>
      <div className="workspace-canvas-controls" role="group" aria-label="Network view controls">
        <button type="button" onClick={() => zoomAt(0.8)} aria-label="Zoom out">−</button>
        <output aria-label="Current network zoom">{Math.round(viewport.zoom * 100)}%</output>
        <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in">+</button>
        <button type="button" className="fit" onClick={fitGraph}>Fit</button>
        <button
          type="button"
          className="labels"
          aria-pressed={labelMode === "all"}
          aria-label={`Label display is ${labelMode}; switch to ${labelMode === "smart" ? "all labels" : "smart collision-aware labels"}`}
          onClick={() => setLabelMode((current) => current === "smart" ? "all" : "smart")}
        >
          {labelMode === "smart" ? "Labels: smart" : "Labels: all"}
        </button>
      </div>
      <div className="workspace-canvas-status" aria-live="polite">
        {hoveredGene
          ? <><strong>{hoveredGene.g}</strong><span>{hoveredGene.isRegulon ? "TF regulon" : "Gene"} · {displayModule(hoveredGene.module)} · {hoveredGene.program}</span><small>{seeds.includes(hoveredGene.g) ? "Selected center gene" : seeds.length < 3 ? "Click to add to the center" : "Three center genes already selected"}</small></>
          : <><strong>{AGES[ageIndex]} proximity view · {Math.round(viewport.zoom * 100)}%</strong><span>Closer circles have stronger displayed connections</span><small>Drag to pan · focus and scroll or use +/− to zoom · Smart labels avoid collisions</small></>}
      </div>
    </div>
  );
}

function CoexpressionCard({
  a,
  b,
  record,
  corr,
  ageIndex,
  comparison,
  loading,
  error,
  onSelect,
}: {
  a: string;
  b: string;
  record: GnnPair | null;
  corr: Triple<number> | null;
  ageIndex: number;
  comparison: PairComparison;
  loading: boolean;
  error: string | null;
  onSelect: (gene: string) => void;
}) {
  const comparisonInfo = PAIR_COMPARISONS.find((item) => item.id === comparison) || PAIR_COMPARISONS[2];
  const earlierValue = corr?.[comparisonInfo.earlier] ?? null;
  const laterValue = corr?.[comparisonInfo.later] ?? null;
  const delta = earlierValue == null || laterValue == null ? null : laterValue - earlierValue;
  const magnitudeDelta = earlierValue == null || laterValue == null
    ? null
    : Math.abs(laterValue) - Math.abs(earlierValue);
  const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;

  return (
    <article className="coexpression-card">
      <div className="coexpression-pair">
        <button onClick={() => onSelect(a)}>{a}</button><span>×</span><button onClick={() => onSelect(b)}>{b}</button>
      </div>
      {corr ? (
        <>
          <div className="pair-comparison-result" aria-label={`${comparisonInfo.label} signed Pearson correlation change`}>
            <span>{comparisonInfo.label}</span>
            <strong>Δr {signed(delta ?? 0)}</strong>
            <small>Δ|r| {signed(magnitudeDelta ?? 0)} · {signed(earlierValue ?? 0)} → {signed(laterValue ?? 0)}</small>
          </div>
          <div className="coexpression-ages">
            {AGES.map((age, index) => {
              const value = corr[index];
              const magnitude = Math.abs(value) * 50;
              const retained = Boolean(record?.present[index]);
              return (
                <div key={age} className={ageIndex === index ? "active" : ""}>
                  <span>{age}<i className={retained ? "retained" : ""} /></span>
                  <div className="correlation-axis" aria-hidden="true"><b /><i className={value < 0 ? "negative" : "positive"} style={{ width: `${magnitude}%`, left: value < 0 ? `${50 - magnitude}%` : "50%" }} /></div>
                  <strong>{signed(value)}</strong>
                  <small>{retained ? "retained GNN edge" : record ? "below this age’s graph cut" : "not retained in GNN union"}</small>
                </div>
              );
            })}
          </div>
        </>
      ) : loading ? (
        <p className="no-pair" role="status" aria-live="polite">Loading the complete all-pair Pearson matrix…</p>
      ) : error ? (
        <p className="no-pair" role="status" aria-live="polite">The all-pair Pearson matrix could not be loaded: {error}</p>
      ) : (
        <p className="no-pair">Pearson values are unavailable for this pair.</p>
      )}
    </article>
  );
}

function LoadingView() {
  return (
    <main className="loading-view">
      <div className="loading-orbit"><i /><i /><i /></div>
      <p>Indexing three model outputs</p>
      <span>Preparing hdWGCNA topology, age-specific GNN graphs and QC-retained SCENIC regulons…</span>
    </main>
  );
}

export default function Home() {
  const [data, setData] = useState<Atlas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("fln");
  const [query, setQuery] = useState("fln");
  const [layer, setLayer] = useState<Layer>("integrated");
  const [ageIndex, setAgeIndex] = useState(0);
  const [neighborLimit, setNeighborLimit] = useState(18);
  const [hubLimit, setHubLimit] = useState(6);
  const [colorMode, setColorMode] = useState<ColorMode>("module");
  const [landscapeClusterMode, setLandscapeClusterMode] = useState<ColorMode>("module");
  const [landscapeConnections, setLandscapeConnections] = useState<ConnectionOption[]>(CONNECTION_OPTIONS);
  const [tab, setTab] = useState<Tab>("workspace");
  const [activeEdge, setActiveEdge] = useState<VisualEdge | null>(null);
  const [trendFilter, setTrendFilter] = useState("all");
  const [candidateDirection, setCandidateDirection] = useState<"increase" | "decrease">("decrease");
  const [workspaceSeeds, setWorkspaceSeeds] = useState<string[]>(["fln"]);
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const [workspaceSearchOpen, setWorkspaceSearchOpen] = useState(false);
  const [workspaceSuggestionIndex, setWorkspaceSuggestionIndex] = useState(0);
  const [workspaceModules, setWorkspaceModules] = useState<string[]>(WORKSPACE_MODULES);
  const [workspacePrograms, setWorkspacePrograms] = useState<string[]>(WORKSPACE_PROGRAMS);
  const [workspaceConnections, setWorkspaceConnections] = useState<ConnectionOption[]>(CONNECTION_OPTIONS);
  const [workspaceNeighborLimit, setWorkspaceNeighborLimit] = useState(10);
  const [workspaceColorMode, setWorkspaceColorMode] = useState<ColorMode>("module");
  const [workspaceComparison, setWorkspaceComparison] = useState<PairComparison>("D50-D0");
  const [allPairCorrelationBuffer, setAllPairCorrelationBuffer] = useState<ArrayBuffer | null>(null);
  const [allPairCorrelationError, setAllPairCorrelationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(atlasAssetUrl("data/atlas.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`Data request failed (${response.status})`);
        return response.json();
      })
      .then((payload: Atlas) => {
        if (!cancelled) setData(payload);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load the atlas data.");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    fetch(atlasAssetUrl(data.allPairCorrelations.file))
      .then((response) => {
        if (!response.ok) throw new Error(`data request failed (${response.status})`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        const expectedBytes = data.allPairCorrelations.pairCount
          * data.allPairCorrelations.ages.length
          * Int16Array.BYTES_PER_ELEMENT;
        if (buffer.byteLength !== expectedBytes) {
          throw new Error(`unexpected file size ${buffer.byteLength.toLocaleString()} bytes`);
        }
        if (!cancelled) setAllPairCorrelationBuffer(buffer);
      })
      .catch((reason) => {
        if (!cancelled) {
          setAllPairCorrelationError(reason instanceof Error ? reason.message : "unknown loading error");
        }
      });
    return () => { cancelled = true; };
  }, [data]);

  const geneMap = useMemo(() => new Map(data?.genes.map((gene) => [gene.g, gene]) || []), [data]);
  const geneNames = useMemo(() => data?.genes.map((gene) => gene.g) || [], [data]);
  const allPairCorrelationView = useMemo(
    () => allPairCorrelationBuffer ? new DataView(allPairCorrelationBuffer) : null,
    [allPairCorrelationBuffer],
  );
  const allPairCorrelationGeneIndex = useMemo(
    () => new Map(data?.allPairCorrelations.geneOrder.map((gene, index) => [gene, index]) || []),
    [data],
  );
  const gnnAdjacency = useMemo(() => {
    const adjacency = new Map<string, GnnEdge[]>();
    if (!data) return adjacency;
    Object.entries(data.gnnPairs).forEach(([key, record]) => {
      const [a, b] = key.split("\t");
      if (!adjacency.has(a)) adjacency.set(a, []);
      if (!adjacency.has(b)) adjacency.set(b, []);
      adjacency.get(a)?.push({ g: b, ...record });
      adjacency.get(b)?.push({ g: a, ...record });
    });
    return adjacency;
  }, [data]);
  const scenicAdjacency = useMemo(() => {
    const outgoing = new Map<string, ScenicEdge[]>();
    const incoming = new Map<string, ScenicEdge[]>();
    if (!data) return { outgoing, incoming };
    data.scenicPairs.forEach(([source, target, weight, rank, percentile]) => {
      if (!outgoing.has(source)) outgoing.set(source, []);
      if (!incoming.has(target)) incoming.set(target, []);
      outgoing.get(source)?.push({ g: target, weight, rank, percentile });
      incoming.get(target)?.push({ g: source, weight, rank, percentile });
    });
    return { outgoing, incoming };
  }, [data]);
  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return geneNames
      .filter((gene) => gene.toLowerCase().includes(normalized))
      .sort((a, b) => Number(!a.toLowerCase().startsWith(normalized)) - Number(!b.toLowerCase().startsWith(normalized)) || a.localeCompare(b))
      .slice(0, 8);
  }, [geneNames, query]);
  const gene = geneMap.get(selected);
  const workspaceSuggestions = useMemo(() => {
    if (!data) return [];
    const normalized = workspaceQuery.trim().toLowerCase();
    const available = data.genes.filter((item) => !workspaceSeeds.includes(item.g));
    return available
      .filter((item) => normalized
        ? item.g.toLowerCase().includes(normalized)
        : item.isRegulon || Boolean(item.hub && item.hub <= 5))
      .sort((a, b) =>
        Number(normalized ? !a.g.toLowerCase().startsWith(normalized) : false)
        - Number(normalized ? !b.g.toLowerCase().startsWith(normalized) : false)
        || Number(!a.isRegulon) - Number(!b.isRegulon)
        || (a.hub || 999) - (b.hub || 999)
        || a.g.localeCompare(b.g))
      .slice(0, 10);
  }, [data, workspaceQuery, workspaceSeeds]);

  const workspaceEdges = useMemo<VisualEdge[]>(() => {
    if (!data) return [];
    const seeds = new Set(workspaceSeeds);
    const allowedNeighbor = (name: string) => {
      if (seeds.has(name)) return true;
      const item = geneMap.get(name);
      const allModules = workspaceModules.length === WORKSPACE_MODULES.length;
      const allPrograms = workspacePrograms.length === WORKSPACE_PROGRAMS.length;
      return Boolean(
        item
        && (allModules || workspaceModules.includes(item.module))
        && item.program
        && (allPrograms || workspacePrograms.includes(item.program)),
      );
    };
    const score = (edge: VisualEdge) => workspaceStrength(
      edge,
      ageIndex,
      data.summary.tom.threshold,
      data.summary.tom.p95,
    );
    const edgeKey = (edge: VisualEdge) => edge.kind === "scenic"
      ? `scenic:${edge.source}>${edge.target}`
      : `${edge.kind}:${gnnPairKey(edge.source, edge.target)}`;
    const selectedEdges = new Map<string, VisualEdge>();
    const enabledConnections = new Set(workspaceConnections);
    const gnnEnabled = enabledConnections.has("gnn-positive") || enabledConnections.has("gnn-negative");
    const gnnVisible = (correlation: number) =>
      enabledConnections.has(correlation < 0 ? "gnn-negative" : "gnn-positive");
    const addEdge = (edge: VisualEdge) => {
      const key = edgeKey(edge);
      const existing = selectedEdges.get(key);
      if (!existing || score(edge) > score(existing)) selectedEdges.set(key, edge);
    };

    workspaceSeeds.forEach((seed) => {
      const methodLists: VisualEdge[][] = [];
      if (gnnEnabled) {
        methodLists.push(
          (gnnAdjacency.get(seed) || [])
            .filter((edge) => allowedNeighbor(edge.g))
            .filter((edge) => gnnVisible(edge.corr[ageIndex]))
            .map((edge) => ({ source: seed, target: edge.g, kind: "gnn" as const, corr: edge.corr, present: edge.present, transition: edge.transition }))
            .sort((a, b) => Math.abs(b.corr?.[ageIndex] || 0) - Math.abs(a.corr?.[ageIndex] || 0)),
        );
      }
      if (enabledConnections.has("scenic")) {
        const scenic = [
          ...(scenicAdjacency.outgoing.get(seed) || []).map((edge) => ({ source: seed, target: edge.g, kind: "scenic" as const, weight: edge.weight, rank: edge.rank, percentile: edge.percentile })),
          ...(scenicAdjacency.incoming.get(seed) || []).map((edge) => ({ source: edge.g, target: seed, kind: "scenic" as const, weight: edge.weight, rank: edge.rank, percentile: edge.percentile })),
        ]
          .filter((edge) => allowedNeighbor(edge.source === seed ? edge.target : edge.source))
          .sort((a, b) => (b.percentile || 0) - (a.percentile || 0) || (b.weight || 0) - (a.weight || 0));
        methodLists.push(scenic);
      }
      if (enabledConnections.has("hdwgcna")) {
        methodLists.push(
          (data.hdEdges[seed] || [])
            .filter((edge) => allowedNeighbor(edge.g))
            .map((edge) => ({ source: seed, target: edge.g, kind: "hdwgcna" as const, tom: edge.tom }))
            .sort((a, b) => (b.tom || 0) - (a.tom || 0)),
        );
      }

      const byNeighbor = new Map<string, VisualEdge[]>();
      methodLists.flat().forEach((edge) => {
        const neighbor = edge.source === seed ? edge.target : edge.source;
        if (!byNeighbor.has(neighbor)) byNeighbor.set(neighbor, []);
        byNeighbor.get(neighbor)?.push(edge);
      });
      const chosen = new Set<string>();
      methodLists.forEach((list) => list.slice(0, 2).forEach((edge) => chosen.add(edge.source === seed ? edge.target : edge.source)));
      Array.from(byNeighbor.entries())
        .sort(([, left], [, right]) => Math.max(...right.map(score)) - Math.max(...left.map(score)))
        .forEach(([neighbor]) => {
          if (chosen.size < workspaceNeighborLimit) chosen.add(neighbor);
        });
      chosen.forEach((neighbor) => byNeighbor.get(neighbor)?.forEach(addEdge));
    });

    for (let left = 0; left < workspaceSeeds.length; left += 1) {
      for (let right = left + 1; right < workspaceSeeds.length; right += 1) {
        const a = workspaceSeeds[left];
        const b = workspaceSeeds[right];
        if (gnnEnabled) {
          const record = data.gnnPairs[gnnPairKey(a, b)];
          if (record && gnnVisible(record.corr[ageIndex])) {
            addEdge({ source: a, target: b, kind: "gnn", corr: record.corr, present: record.present, transition: record.transition });
          }
        }
        if (enabledConnections.has("hdwgcna")) {
          const record = (data.hdEdges[a] || []).find((edge) => edge.g === b) || (data.hdEdges[b] || []).find((edge) => edge.g === a);
          if (record) addEdge({ source: a, target: b, kind: "hdwgcna", tom: record.tom });
        }
        if (enabledConnections.has("scenic")) {
          (scenicAdjacency.outgoing.get(a) || []).filter((edge) => edge.g === b).forEach((edge) => addEdge({ source: a, target: b, kind: "scenic", weight: edge.weight, rank: edge.rank, percentile: edge.percentile }));
          (scenicAdjacency.outgoing.get(b) || []).filter((edge) => edge.g === a).forEach((edge) => addEdge({ source: b, target: a, kind: "scenic", weight: edge.weight, rank: edge.rank, percentile: edge.percentile }));
        }
      }
    }
    return Array.from(selectedEdges.values());
  }, [data, workspaceSeeds, workspaceModules, workspacePrograms, workspaceConnections, workspaceNeighborLimit, geneMap, gnnAdjacency, scenicAdjacency, ageIndex]);

  const workspacePatternPairs = useMemo(() => {
    if (!data || !workspaceSeeds.length) return [];
    const pairValues = (a: string, b: string, record: GnnPair | null) =>
      readAllPairCorrelation(
        allPairCorrelationView,
        data.allPairCorrelations,
        allPairCorrelationGeneIndex,
        a,
        b,
      ) || record?.corr || null;
    const pairs: { a: string; b: string; record: GnnPair | null; corr: Triple<number> | null }[] = [];
    if (workspaceSeeds.length > 1) {
      for (let left = 0; left < workspaceSeeds.length; left += 1) {
        for (let right = left + 1; right < workspaceSeeds.length; right += 1) {
          const a = workspaceSeeds[left];
          const b = workspaceSeeds[right];
          const record = data.gnnPairs[gnnPairKey(a, b)] || null;
          pairs.push({ a, b, record, corr: pairValues(a, b, record) });
        }
      }
      return pairs;
    }
    const seed = workspaceSeeds[0];
    const allModules = workspaceModules.length === WORKSPACE_MODULES.length;
    const allPrograms = workspacePrograms.length === WORKSPACE_PROGRAMS.length;
    return (gnnAdjacency.get(seed) || [])
      .filter((edge) => {
        const item = geneMap.get(edge.g);
        return Boolean(
          item
          && (allModules || workspaceModules.includes(item.module))
          && item.program
          && (allPrograms || workspacePrograms.includes(item.program)),
        );
      })
      .sort((a, b) => Math.abs(b.corr[ageIndex]) - Math.abs(a.corr[ageIndex]))
      .slice(0, 3)
      .map((edge) => {
        const record = data.gnnPairs[gnnPairKey(seed, edge.g)] || null;
        return { a: seed, b: edge.g, record, corr: pairValues(seed, edge.g, record) };
      });
  }, [
    data,
    workspaceSeeds,
    workspaceModules,
    workspacePrograms,
    geneMap,
    gnnAdjacency,
    ageIndex,
    allPairCorrelationView,
    allPairCorrelationGeneIndex,
  ]);

  const overviewNodes = useMemo<Gene[]>(() => {
    if (!data) return [];
    const names = new Set<string>();
    const addGroupSelection = (primary: string[], transcriptionFactors: string[]) => {
      const tfSlots = Math.min(2, Math.max(hubLimit - 1, 0));
      const primarySlots = Math.max(1, hubLimit - tfSlots);
      const prioritized = [
        ...primary.slice(0, primarySlots),
        ...transcriptionFactors.slice(0, tfSlots),
        ...primary,
        ...transcriptionFactors,
      ];
      Array.from(new Set(prioritized)).slice(0, hubLimit).forEach((name) => names.add(name));
    };
    if (landscapeClusterMode === "module") {
      data.modules
        .filter((module) => module.id !== "grey")
        .forEach((module) => {
          const moduleGenes = module.hubs.map((hub) => hub.g);
          const moduleTfs = data.tfTrends
            .filter((trend) => trend.module === module.id && trend.hub)
            .sort((a, b) => (a.hub || 99) - (b.hub || 99))
            .map((trend) => trend.g);
          addGroupSelection(moduleGenes, moduleTfs);
        });
    } else {
      data.programs.forEach((program) => {
        const programGenes = data.genes
          .filter((item) => item.program === program.id)
          .sort((a, b) =>
            meanGnnWeightedDegree(b) - meanGnnWeightedDegree(a)
            || (b.confidence || 0) - (a.confidence || 0)
            || (b.silhouette || -1) - (a.silhouette || -1)
            || a.g.localeCompare(b.g))
          .map((item) => item.g);
        const programTfs = data.tfTrends
          .filter((trend) => trend.program === program.id)
          .sort((a, b) => b.targets - a.targets || Math.abs(b.delta) - Math.abs(a.delta))
          .map((trend) => trend.g);
        addGroupSelection(programGenes, programTfs);
      });
    }
    return Array.from(names).map((name) => geneMap.get(name)).filter((item): item is Gene => Boolean(item));
  }, [data, geneMap, hubLimit, landscapeClusterMode]);

  const landscapeGroups = useMemo<LandscapeGroup[]>(() => {
    if (!data) return [];
    if (landscapeClusterMode === "module") {
      return data.modules
        .filter((module) => module.id !== "grey")
        .map((module) => {
          const hubRank = new Map(module.hubs.map((hub, index) => [hub.g, index]));
          const order = overviewNodes
            .filter((item) => item.module === module.id)
            .sort((a, b) =>
              (hubRank.get(a.g) ?? 999) - (hubRank.get(b.g) ?? 999)
              || meanGnnWeightedDegree(b) - meanGnnWeightedDegree(a)
              || a.g.localeCompare(b.g))
            .map((item) => item.g);
          return {
            id: module.id,
            genes: module.genes,
            color: MODULE_COLORS[module.color] || MODULE_COLORS.unassigned,
            order,
          };
        });
    }
    return data.programs.map((program) => ({
      id: program.id,
      genes: program.genes,
      color: PROGRAM_COLORS[program.id] || PROGRAM_COLORS.unassigned,
      order: overviewNodes
        .filter((item) => item.program === program.id)
        .sort((a, b) =>
          meanGnnWeightedDegree(b) - meanGnnWeightedDegree(a)
          || (b.confidence || 0) - (a.confidence || 0)
          || a.g.localeCompare(b.g))
        .map((item) => item.g),
    }));
  }, [data, landscapeClusterMode, overviewNodes]);

  const overviewEdges = useMemo<VisualEdge[]>(() => {
    if (!data || !overviewNodes.length) return [];
    const names = new Set(overviewNodes.map((item) => item.g));
    const hd = new Map<string, VisualEdge>();
    const gnn = new Map<string, VisualEdge>();
    const scenic = new Map<string, VisualEdge>();
    names.forEach((source) => {
      (data.hdEdges[source] || []).forEach((edge) => {
        if (!names.has(edge.g)) return;
        const pair = [source, edge.g].sort();
        const key = pair.join("::");
        const existing = hd.get(key);
        if (!existing || (edge.tom || 0) > (existing.tom || 0)) {
          hd.set(key, { source: pair[0], target: pair[1], kind: "hdwgcna", tom: edge.tom });
        }
      });
      (data.gnnEdges[source] || []).forEach((edge) => {
        if (!names.has(edge.g) || !edge.present[ageIndex]) return;
        const pair = [source, edge.g].sort();
        const key = pair.join("::");
        const existing = gnn.get(key);
        if (!existing || Math.abs(edge.corr[ageIndex]) > Math.abs(existing.corr?.[ageIndex] || 0)) {
          gnn.set(key, { source: pair[0], target: pair[1], kind: "gnn", corr: edge.corr, present: edge.present, transition: edge.transition });
        }
      });
      (data.scenicOutgoing[source] || []).forEach((edge) => {
        if (!names.has(edge.g)) return;
        scenic.set(`${source}::${edge.g}`, { source, target: edge.g, kind: "scenic", weight: edge.weight, rank: edge.rank, percentile: edge.percentile });
      });
    });
    const hdEdges = Array.from(hd.values()).sort((a, b) => (b.tom || 0) - (a.tom || 0));
    const gnnEdges = Array.from(gnn.values()).sort((a, b) => Math.abs(b.corr?.[ageIndex] || 0) - Math.abs(a.corr?.[ageIndex] || 0));
    const scenicEdges = Array.from(scenic.values())
      .sort((a, b) => (b.percentile || 0) - (a.percentile || 0) || (b.weight || 0) - (a.weight || 0))
      .slice(0, hubLimit * landscapeGroups.length);
    const enabled = new Set(landscapeConnections);
    const gnnCapPerSign = hubLimit * landscapeGroups.length;
    return [
      ...(enabled.has("hdwgcna") ? hdEdges.slice(0, hubLimit * landscapeGroups.length * 2) : []),
      ...(enabled.has("gnn-positive")
        ? gnnEdges.filter((edge) => edgeConnectionOption(edge, ageIndex) === "gnn-positive").slice(0, gnnCapPerSign)
        : []),
      ...(enabled.has("gnn-negative")
        ? gnnEdges.filter((edge) => edgeConnectionOption(edge, ageIndex) === "gnn-negative").slice(0, gnnCapPerSign)
        : []),
      ...(enabled.has("scenic") ? scenicEdges : []),
    ];
  }, [data, overviewNodes, hubLimit, ageIndex, landscapeConnections, landscapeGroups.length]);

  const visualEdges = useMemo<VisualEdge[]>(() => {
    if (!data) return [];
    const hd = (data.hdEdges[selected] || []).slice(0, layer === "integrated" ? Math.ceil(neighborLimit * 0.4) : neighborLimit).map((edge) => ({
      source: selected,
      target: edge.g,
      kind: "hdwgcna" as const,
      tom: edge.tom,
    }));
    const gnn = (data.gnnEdges[selected] || [])
      .filter((edge) => Boolean(edge.present[ageIndex]))
      .sort((a, b) => Math.abs(b.corr[ageIndex]) - Math.abs(a.corr[ageIndex]))
      .slice(0, layer === "integrated" ? Math.ceil(neighborLimit * 0.5) : neighborLimit)
      .map((edge) => ({ source: selected, target: edge.g, kind: "gnn" as const, corr: edge.corr, present: edge.present, transition: edge.transition }));
    const outgoing = data.scenicOutgoing[selected] || [];
    const incoming = data.scenicIncoming[selected] || [];
    const scenicByDirection = new Map<string, VisualEdge>();
    const addScenic = (edge: VisualEdge) => {
      const key = `${edge.source}::${edge.target}`;
      const existing = scenicByDirection.get(key);
      if (
        !existing
        || (edge.percentile || 0) > (existing.percentile || 0)
        || ((edge.percentile || 0) === (existing.percentile || 0) && (edge.weight || 0) > (existing.weight || 0))
      ) {
        scenicByDirection.set(key, edge);
      }
    };
    outgoing.forEach((edge) => addScenic({ source: selected, target: edge.g, kind: "scenic", weight: edge.weight, rank: edge.rank, percentile: edge.percentile }));
    incoming.forEach((edge) => addScenic({ source: edge.g, target: selected, kind: "scenic", weight: edge.weight, rank: edge.rank, percentile: edge.percentile }));
    const scenic = Array.from(scenicByDirection.values())
      .sort((a, b) => (b.percentile || 0) - (a.percentile || 0) || (b.weight || 0) - (a.weight || 0))
      .slice(0, layer === "integrated" ? Math.ceil(neighborLimit * 0.35) : neighborLimit);
    if (layer === "hdwgcna") return hd;
    if (layer === "gnn") return gnn;
    if (layer === "scenic") return scenic;
    return [...hd, ...gnn, ...scenic].slice(0, neighborLimit + 8);
  }, [data, selected, layer, neighborLimit, ageIndex]);

  if (error) return <main className="error-view"><strong>Atlas data could not be opened.</strong><span>{error}</span></main>;
  if (!data || !gene) return <LoadingView />;

  const selectGene = (geneName: string, nextTab: Tab = "explore") => {
    if (!geneMap.has(geneName)) return;
    setSelected(geneName);
    setQuery(geneName);
    setActiveEdge(null);
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const exact = geneNames.find((name) => name.toLowerCase() === query.trim().toLowerCase());
    selectGene(exact || suggestions[0] || selected);
  };
  const addWorkspaceGene = (geneName: string) => {
    const exact = geneNames.find((name) => name.toLowerCase() === geneName.trim().toLowerCase());
    if (!exact || workspaceSeeds.includes(exact) || workspaceSeeds.length >= 3) return;
    setWorkspaceSeeds((current) => [...current, exact]);
    setSelected(exact);
    setQuery(exact);
    setWorkspaceQuery("");
    setWorkspaceSearchOpen(false);
  };
  const submitWorkspaceGene = (event: FormEvent) => {
    event.preventDefault();
    const exact = geneNames.find((name) => name.toLowerCase() === workspaceQuery.trim().toLowerCase());
    addWorkspaceGene(exact || workspaceSuggestions[workspaceSuggestionIndex]?.g || workspaceSuggestions[0]?.g || "");
  };
  const promoteWorkspaceGene = (geneName: string) => {
    setSelected(geneName);
    setQuery(geneName);
    if (!workspaceSeeds.includes(geneName) && workspaceSeeds.length < 3) {
      setWorkspaceSeeds((current) => [...current, geneName]);
    }
  };
  const removeWorkspaceGene = (geneName: string) => {
    if (workspaceSeeds.length === 1) return;
    setWorkspaceSeeds((current) => current.filter((name) => name !== geneName));
  };
  const toggleWorkspaceModule = (module: string) => {
    setWorkspaceModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module]);
  };
  const toggleWorkspaceProgram = (program: string) => {
    setWorkspacePrograms((current) => current.includes(program) ? current.filter((item) => item !== program) : [...current, program]);
  };
  const resetWorkspace = () => {
    setWorkspaceSeeds(["fln"]);
    setWorkspaceQuery("");
    setSelected("fln");
    setQuery("fln");
    setAgeIndex(0);
    setWorkspaceModules(WORKSPACE_MODULES);
    setWorkspacePrograms(WORKSPACE_PROGRAMS);
    setWorkspaceConnections(CONNECTION_OPTIONS);
    setWorkspaceNeighborLimit(10);
    setWorkspaceColorMode("module");
    setWorkspaceComparison("D50-D0");
    setTab("workspace");
  };
  const activity = data.activity[selected];
  const resolvedActiveEdge = activeEdge && visualEdges.includes(activeEdge) ? activeEdge : visualEdges[0] || null;
  const activePartner = resolvedActiveEdge ? (resolvedActiveEdge.source === selected ? resolvedActiveEdge.target : resolvedActiveEdge.source) : null;
  const activeActivity = resolvedActiveEdge?.kind === "scenic" ? data.activity[resolvedActiveEdge.source] : null;
  const filteredTrends = data.tfTrends.filter((trend) => trendFilter === "all" || trend.pattern === trendFilter).slice(0, 70);
  const graphAge = data.graphAges[ageIndex];
  const workspaceNodeCount = new Set([...workspaceSeeds, ...workspaceEdges.flatMap((edge) => [edge.source, edge.target])]).size;
  const workspaceRankedEdges = [...workspaceEdges].sort((a, b) =>
    workspaceStrength(b, ageIndex, data.summary.tom.threshold, data.summary.tom.p95)
    - workspaceStrength(a, ageIndex, data.summary.tom.threshold, data.summary.tom.p95));
  const trajectoryGenes = [...data.genes]
    .filter((item) => item.program && item.ageUmap?.every(Boolean) && item.displacement?.[2] !== null)
    .sort((a, b) => (b.displacement?.[2] || 0) - (a.displacement?.[2] || 0))
    .slice(0, 34);
  const candidateRows = data.decoderCandidates.filter((candidate) => candidate.direction === candidateDirection).slice(0, 36);
  const matrixModules = data.modules.map((module) => module.id);
  const matrixMaximum = Math.max(...data.programs.flatMap((program) => matrixModules.map((module) => data.programModuleMatrix[program.id]?.[module] || 0)), 1);
  const selectedInOverview = overviewNodes.some((item) => item.g === selected);
  const landscapeHasConnectionLines = landscapeConnections.some((option) => option !== "regulon");

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={resetWorkspace} aria-label="Open the default fln gene workspace">
          <span className="brand-mark"><i /><i /><i /></span>
          <span><strong>IFM / Network Atlas</strong><small>GNN × hdWGCNA × SCENIC</small></span>
        </button>
        <nav aria-label="Atlas sections">
          {(["workspace", "landscape", "explore", "gnn", "regulons", "modules", "methods"] as Tab[]).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>
              {item === "workspace" ? "Gene workspace" : item === "landscape" ? "Big picture" : item === "gnn" ? "GNN dynamics" : item === "regulons" ? "TF dynamics" : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>
        <div className="source-badge"><i /> Interactive · no sign-in</div>
      </header>

      {tab === "workspace" && (
        <section className="workspace-page">
          <section className="workspace-hero">
            <div>
              <p className="eyebrow">Interactive gene set / one to three center genes</p>
              <h1>Watch gene relationships tighten or loosen from D0 to D50.</h1>
              <p>Selected genes stay in the middle. In the surrounding network, <GlossaryTerm term="proximity">stronger connections sit closer</GlossaryTerm>, while bright <GlossaryTerm term="scenicArrow">red SCENIC arrows</GlossaryTerm> point from a TF regulon to its candidate target.</p>
            </div>
            <div className="workspace-age-callout"><span>Current age</span><strong>{AGES[ageIndex]}</strong><small>{data.meta.cellsByAge[AGES[ageIndex]].toLocaleString()} IFM cells</small><button onClick={resetWorkspace}>Reset to fln</button></div>
          </section>

          <section className="workspace-builder panel">
            <div className="workspace-picker">
              <div className="workspace-picker-head"><span>Add center gene or TF</span><b>{workspaceSeeds.length}/3 selected</b></div>
              <form className="workspace-search" onSubmit={submitWorkspaceGene}>
                <div className="workspace-search-input">
                  <input
                    value={workspaceQuery}
                    disabled={workspaceSeeds.length >= 3}
                    placeholder={workspaceSeeds.length >= 3 ? "Remove a center to add another" : "Type a gene symbol, e.g. Mef2"}
                    role="combobox"
                    aria-label="Add a gene or transcription-factor regulon"
                    aria-autocomplete="list"
                    aria-expanded={workspaceSearchOpen && workspaceSuggestions.length > 0}
                    aria-controls="workspace-gene-options"
                    aria-activedescendant={workspaceSearchOpen && workspaceSuggestions[workspaceSuggestionIndex] ? `workspace-option-${workspaceSuggestions[workspaceSuggestionIndex].g}` : undefined}
                    onFocus={() => setWorkspaceSearchOpen(true)}
                    onBlur={() => setWorkspaceSearchOpen(false)}
                    onChange={(event) => { setWorkspaceQuery(event.target.value); setWorkspaceSuggestionIndex(0); setWorkspaceSearchOpen(true); }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setWorkspaceSearchOpen(false);
                        return;
                      }
                      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        if (!workspaceSuggestions.length) return;
                        const direction = event.key === "ArrowDown" ? 1 : -1;
                        setWorkspaceSuggestionIndex((current) => (current + direction + workspaceSuggestions.length) % workspaceSuggestions.length);
                        setWorkspaceSearchOpen(true);
                        event.preventDefault();
                      }
                    }}
                  />
                  <button type="submit" disabled={workspaceSeeds.length >= 3 || !workspaceSuggestions.length}>Add</button>
                </div>
                {workspaceSearchOpen && workspaceSuggestions.length > 0 && (
                  <div className="workspace-suggestions" id="workspace-gene-options" role="listbox" aria-label="Matching genes and regulons">
                    {workspaceSuggestions.map((item, index) => (
                      <button
                        type="button"
                        id={`workspace-option-${item.g}`}
                        role="option"
                        aria-selected={workspaceSuggestionIndex === index}
                        className={workspaceSuggestionIndex === index ? "active" : ""}
                        key={item.g}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setWorkspaceSuggestionIndex(index)}
                        onClick={() => addWorkspaceGene(item.g)}
                      >
                        <i style={{ background: colorFor(item, workspaceColorMode) }} />
                        <span><strong>{item.g}</strong><small>{displayModule(item.module)} · {item.program}</small></span>
                        <em className={item.isRegulon ? "regulon" : ""}>{item.isRegulon ? "TF regulon" : "Gene"}</em>
                      </button>
                    ))}
                  </div>
                )}
              </form>
              <div className="workspace-seeds" aria-label="Selected center genes">
                {workspaceSeeds.map((name) => {
                  const item = geneMap.get(name)!;
                  return (
                    <div key={name}>
                      <i style={{ background: colorFor(item, workspaceColorMode) }} />
                      <span><strong>{name}</strong><small>{item.isRegulon ? "TF regulon" : "Gene"} · {displayModule(item.module)} · {item.program}</small></span>
                      <button disabled={workspaceSeeds.length === 1} aria-label={`Remove ${name} from center genes`} onClick={() => removeWorkspaceGene(name)}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="workspace-age-control">
              <span>Network snapshot age</span>
              <div className="workspace-age-buttons">
                {AGES.map((age, index) => (
                  <button key={age} className={ageIndex === index ? "active" : ""} aria-pressed={ageIndex === index} onClick={() => setAgeIndex(index)}>
                    <strong>{age}</strong><small>{data.meta.cellsByAge[age].toLocaleString()} cells</small>
                  </button>
                ))}
              </div>
              <p>Node distance and blue/orange co-expression lines update with age. hdWGCNA co-expression and SCENIC topology remain static.</p>
            </div>
          </section>

          <section className="workspace-filters panel" aria-label="Network filters">
            <div className="workspace-filter-group connection-filter-row">
              <span><GlossaryTerm term="connectionFilter" placement="left">Connections &amp; markers</GlossaryTerm></span>
              <ConnectionToggleGroup
                value={workspaceConnections}
                onChange={setWorkspaceConnections}
                ariaLabel="Connections and markers shown in the gene workspace"
              />
            </div>
            <div className="workspace-filter-group">
              <span><GlossaryTerm term="autoFilters" placement="left">hdWGCNA modules</GlossaryTerm><button className="all-filter" onClick={() => setWorkspaceModules(WORKSPACE_MODULES)}>All</button></span>
              <div>{WORKSPACE_MODULES.map((module) => <button key={module} className={workspaceModules.includes(module) ? "active" : ""} aria-pressed={workspaceModules.includes(module)} onClick={() => toggleWorkspaceModule(module)}>{displayModule(module)}</button>)}</div>
            </div>
            <div className="workspace-filter-group">
              <span>GNN programs<button className="all-filter" onClick={() => setWorkspacePrograms(WORKSPACE_PROGRAMS)}>All</button></span>
              <div>{WORKSPACE_PROGRAMS.map((program) => <button key={program} className={workspacePrograms.includes(program) ? "active" : ""} aria-pressed={workspacePrograms.includes(program)} onClick={() => toggleWorkspaceProgram(program)}>{program}</button>)}</div>
            </div>
            <label className="workspace-neighbor-control">
              <span>Neighbors per center <b>{workspaceNeighborLimit}</b></span>
              <input
                type="range"
                min="5"
                max="30"
                value={workspaceNeighborLimit}
                aria-label="Neighbors displayed per center gene"
                aria-valuetext={`${workspaceNeighborLimit} neighbors per center gene`}
                onChange={(event) => setWorkspaceNeighborLimit(Number(event.target.value))}
              />
            </label>
            <div className="workspace-filter-group color">
              <span>Circle color</span>
              <div>{(["module", "program"] as ColorMode[]).map((mode) => <button key={mode} className={workspaceColorMode === mode ? "active" : ""} aria-pressed={workspaceColorMode === mode} onClick={() => setWorkspaceColorMode(mode)}>{mode === "module" ? "M1–M5" : "C1–C6"}</button>)}</div>
            </div>
          </section>

          <section className="workspace-network panel">
            <div className="workspace-network-head">
              <div><span className="section-kicker">Age-aware interaction field</span><h2>{workspaceSeeds.join(" · ")}</h2><p>{workspaceNodeCount} genes · {workspaceEdges.length} displayed connections</p></div>
              <div className="workspace-network-age"><span>{AGES[ageIndex]}</span><strong>Nearer = stronger</strong><small>based on current |Pearson r| when available</small></div>
            </div>
            <WorkspaceNetworkCanvas
              seeds={workspaceSeeds}
              edges={workspaceEdges}
              genes={geneMap}
              ageIndex={ageIndex}
              tomThreshold={data.summary.tom.threshold}
              tomP95={data.summary.tom.p95}
              colorMode={workspaceColorMode}
              showRegulonRings={workspaceConnections.includes("regulon")}
              onPromote={promoteWorkspaceGene}
            />
            <div className="workspace-legend">
              {workspaceConnections.includes("gnn-positive") && <span><i className="workspace-line gnn-positive" /> positive GNN r</span>}
              {workspaceConnections.includes("gnn-negative") && <span><i className="workspace-line gnn-negative" /> negative GNN r</span>}
              {workspaceConnections.includes("hdwgcna") && <span><i className="workspace-line hd" /> hdWGCNA co-expression</span>}
              {workspaceConnections.includes("scenic") && <span><i className="workspace-line scenic" /> SCENIC TF <b>→</b> target</span>}
              {workspaceConnections.includes("regulon") && <span><i className="workspace-ring" /> TF regulon ring</span>}
              {!workspaceConnections.length && <span>All connections and TF markers are hidden.</span>}
            </div>
            <p className="workspace-network-note">
              All circles selected for this filtered neighborhood are shown. Smart labels hide collisions but always retain center and hovered names; zooming reveals more without changing any network value.
              {workspaceConnections.includes("scenic") && " Red arrows are directed SCENIC candidates; their width uses within-target regulator rank and does not change with age."}
              {(workspaceConnections.includes("gnn-positive") || workspaceConnections.includes("gnn-negative")) && " Faint dashed GNN lines have a measured r at this age but fall below that age’s retained graph cut."}
              {!workspaceConnections.some((option) => option !== "regulon") && " Connection lines are hidden; selected center genes and any enabled TF rings remain visible."}
            </p>
          </section>

          <section className="workspace-analysis-grid">
            <article className="workspace-coexpression panel">
              <div className="panel-heading compact"><div><span className="section-kicker">D0 → D25 → D50</span><h3>Selected-gene co-expression pattern</h3></div><span><GlossaryTerm term="pearson" placement="right">signed Pearson r</GlossaryTerm></span></div>
              <div className="pair-comparison-toolbar">
                <span>Compare two ages<small>Δr = later − earlier · positive Δ|r| means stronger absolute co-expression</small></span>
                <div role="group" aria-label="Select the two ages used for pairwise Pearson comparison">
                  {PAIR_COMPARISONS.map((item) => (
                    <button
                      key={item.id}
                      className={workspaceComparison === item.id ? "active" : ""}
                      aria-pressed={workspaceComparison === item.id}
                      onClick={() => setWorkspaceComparison(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="workspace-panel-copy">{workspaceSeeds.length === 1
                ? `Showing the three strongest ${AGES[ageIndex]} retained-graph partners around ${workspaceSeeds[0]}. Add a second or third center gene to compare any exact pair.`
                : `Every selected pair is read from all ${data.allPairCorrelations.pairCount.toLocaleString()} possible gene pairs. No coherent-trend or GNN-retention filter is applied.`}</p>
              <div className="coexpression-grid">
                {workspacePatternPairs.map((pair) => (
                  <CoexpressionCard
                    key={`${pair.a}-${pair.b}`}
                    {...pair}
                    ageIndex={ageIndex}
                    comparison={workspaceComparison}
                    loading={!allPairCorrelationBuffer && !allPairCorrelationError}
                    error={allPairCorrelationError}
                    onSelect={(name) => selectGene(name)}
                  />
                ))}
              </div>
            </article>

            <aside className="workspace-centers panel">
              <div className="panel-heading compact"><div><span className="section-kicker">Center genes</span><h3>Expression and group identity</h3></div><span>{workspaceSeeds.length}/3</span></div>
              {workspaceSeeds.map((name) => {
                const item = geneMap.get(name)!;
                return (
                  <div className="workspace-center-row" key={name}>
                    <div className="workspace-center-title"><i style={{ background: colorFor(item, workspaceColorMode) }} /><span><strong>{name}</strong><small>{item.isRegulon ? "TF regulon" : "Gene"} · {displayModule(item.module)} · {item.program}{item.hub ? ` · hub #${item.hub}` : ""}</small></span><button onClick={() => selectGene(name)}>Profile →</button></div>
                    {item.expression && <MetricBars values={item.expression} format={(value) => value.toFixed(2)} />}
                  </div>
                );
              })}
            </aside>
          </section>

          <section className="workspace-relationships panel">
            <div className="panel-heading compact"><div><span className="section-kicker">Accessible relationship list</span><h3>Strongest displayed connections at {AGES[ageIndex]}</h3></div><span>{workspaceEdges.length} total</span></div>
            <div className="workspace-relationship-head"><span>Relationship</span><span>Connection</span><span>Current value</span><span>Interpretation</span></div>
            {workspaceRankedEdges.slice(0, 18).map((edge) => {
              const value = edge.kind === "gnn"
                ? `r ${(edge.corr?.[ageIndex] || 0) >= 0 ? "+" : ""}${edge.corr?.[ageIndex].toFixed(3)}`
                : edge.kind === "hdwgcna"
                  ? `TOM ${edge.tom?.toFixed(3)}`
                  : `rank ${edge.rank} · p${Math.round((edge.percentile || 0) * 100)}`;
              return (
                <div className="workspace-relationship-row" key={`${edge.kind}-${edge.source}-${edge.target}`}>
                  <span><button onClick={() => promoteWorkspaceGene(edge.source)}>{edge.source}</button><b>{edge.kind === "scenic" ? "→" : "×"}</b><button onClick={() => promoteWorkspaceGene(edge.target)}>{edge.target}</button></span>
                  <em className={edge.kind}>{edge.kind === "hdwgcna" ? "hdWGCNA" : edge.kind === "gnn" ? "GNN" : "SCENIC"}</em>
                  <code className={edge.kind === "gnn" && (edge.corr?.[ageIndex] || 0) < 0 ? "negative" : ""}>{value}</code>
                  <small>{edge.kind === "gnn" ? edge.present?.[ageIndex] ? "retained at this age" : "below retained-graph cut" : edge.kind === "hdwgcna" ? "static hdWGCNA co-expression" : "TF → motif-pruned candidate"}</small>
                </div>
              );
            })}
          </section>
        </section>
      )}

      {tab === "landscape" && (
        <section className="landscape-page">
          <section className="landscape-hero">
            <div>
              <p className="eyebrow">Three-model systems view / multiple genes at once</p>
              <h1>See stable topology, age rewiring and regulatory bridges <em>in one field.</em></h1>
              <p className="landscape-copy">Switch the field between five <GlossaryTerm term="module">hdWGCNA module</GlossaryTerm> neighborhoods and six unsupervised <GlossaryTerm term="program">GNN program</GlossaryTerm> neighborhoods. hdWGCNA co-expression, age-specific <GlossaryTerm term="graphEdge">GNN graph edges</GlossaryTerm>, directed <GlossaryTerm term="scenic">SCENIC</GlossaryTerm> arrows, and TF rings can each be shown or hidden independently.</p>
              <p className="glossary-hint"><i>?</i> Hover or keyboard-focus dotted terms for a plain-language definition.</p>
            </div>
            <button className="focus-cta" onClick={() => setTab("explore")}>Open {selected} in gene focus <span>→</span></button>
          </section>

          <section className="landscape-toolbar panel" aria-label="Hub landscape controls">
            <div className="landscape-control landscape-connection-control">
              <span><GlossaryTerm term="connectionFilter" placement="left">Connection</GlossaryTerm></span>
              <ConnectionToggleGroup
                value={landscapeConnections}
                onChange={setLandscapeConnections}
                ariaLabel="Connections and markers shown in the big-picture graph"
              />
            </div>
            <div className="landscape-control">
              <span><GlossaryTerm term="graphEdge" placement="left">GNN age graph</GlossaryTerm></span>
              <div className="segmented age-segmented">
                {AGES.map((age, index) => <button key={age} className={ageIndex === index ? "active" : ""} aria-pressed={ageIndex === index} onClick={() => setAgeIndex(index)}>{age}</button>)}
              </div>
            </div>
            <div className="landscape-control">
              <span>Cluster layout</span>
              <div className="segmented">
                {(["module", "program"] as ColorMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={landscapeClusterMode === mode ? "active" : ""}
                    aria-pressed={landscapeClusterMode === mode}
                    onClick={() => setLandscapeClusterMode(mode)}
                  >
                    {mode === "module" ? "hdWGCNA · M1–M5" : "GNN · C1–C6"}
                  </button>
                ))}
              </div>
            </div>
            <label className="landscape-control hub-density">
              <span>Genes per group <b>{hubLimit}</b></span>
              <input
                type="range"
                min="3"
                max="8"
                value={hubLimit}
                aria-label="Genes displayed per landscape group"
                aria-valuetext={`${hubLimit} genes per group`}
                onChange={(event) => setHubLimit(Number(event.target.value))}
              />
            </label>
            <div className="landscape-count"><strong>{landscapeGroups.length}</strong><span>clusters</span><strong>{overviewNodes.length}</strong><span>genes</span><strong>{overviewEdges.length}</strong><span>connections</span></div>
          </section>

          <section className="landscape-network panel">
            <div className="landscape-network-head">
              <div><span className="section-kicker">Multi-model connection landscape</span><h2>{landscapeGroups.length} {landscapeClusterMode === "module" ? "hdWGCNA module" : "GNN program"} neighborhoods</h2></div>
              <button onClick={() => setTab("explore")}><i style={{ background: colorFor(gene, landscapeClusterMode) }} /><span><small>{selectedInOverview ? "Selected gene" : "Outside displayed gene subset"}</small><strong>{selected}</strong></span><b>Inspect →</b></button>
            </div>
            <HubLandscapeCanvas
              nodes={overviewNodes}
              edges={overviewEdges}
              groups={landscapeGroups}
              groupMode={landscapeClusterMode}
              ageIndex={ageIndex}
              selected={selected}
              tomMedian={data.summary.tom.median}
              tomP95={data.summary.tom.p95}
              gnnMedian={graphAge.medianAbsCorrelation}
              gnnP95={graphAge.p95AbsCorrelation}
              colorMode={landscapeClusterMode}
              showRegulonRings={landscapeConnections.includes("regulon")}
              onSelect={(geneName) => { setSelected(geneName); setQuery(geneName); }}
            />
            <div className="landscape-legends">
              <div className="module-key">
                <span className="legend-title">{landscapeClusterMode === "module" ? <GlossaryTerm term="module" placement="left">Module color</GlossaryTerm> : <GlossaryTerm term="program" placement="left">Program color</GlossaryTerm>}</span>
                {landscapeClusterMode === "module"
                  ? data.modules.filter((module) => module.id !== "grey").map((module) => <span key={module.id}><i style={{ background: MODULE_COLORS[module.color] }} />{displayModule(module.id)}</span>)
                  : data.programs.map((program) => <span key={program.id}><i style={{ background: PROGRAM_COLORS[program.id] }} />{program.id}</span>)}
              </div>
              <div className="strength-key">
                <span className="legend-title"><GlossaryTerm term="strength">Connection strength</GlossaryTerm></span>
                {landscapeHasConnectionLines ? (
                  <>
                    <span><i className="strength-line strong" /> strong</span>
                    <span><i className="strength-line medium" /> medium</span>
                    <span><i className="strength-line weak" /> weak</span>
                  </>
                ) : <span>No connection lines selected</span>}
              </div>
              <div className="evidence-key">
                <span className="legend-title">Connection type</span>
                {landscapeConnections.includes("hdwgcna") && <span><i className="evidence-line hd" /> hdWGCNA co-expression</span>}
                {landscapeConnections.includes("gnn-positive") && <span><i className="evidence-line gnn" /> positive <GlossaryTerm term="pearson">GNN r</GlossaryTerm></span>}
                {landscapeConnections.includes("gnn-negative") && <span><i className="evidence-line gnn-negative" /> negative <GlossaryTerm term="pearson">GNN r</GlossaryTerm></span>}
                {landscapeConnections.includes("scenic") && <span><i className="evidence-line scenic" /> <GlossaryTerm term="scenic">SCENIC</GlossaryTerm> →</span>}
                {landscapeConnections.includes("regulon") && <span><i className="tf-ring" /> <GlossaryTerm term="regulon" placement="right">TF regulon ring</GlossaryTerm></span>}
                {!landscapeConnections.length && <span>All connections and TF markers are hidden.</span>}
              </div>
            </div>
          </section>

          <section className="landscape-selection panel">
            <div className="selection-gene"><i style={{ background: colorFor(gene, landscapeClusterMode) }} /><div><span>{selectedInOverview ? "Selected in the landscape" : "Current gene · not drawn in displayed subset"}</span><h3>{selected}</h3><p>{gene.module} · {gene.program || "no GNN program"}{gene.isRegulon ? " · SCENIC regulon" : ""}</p></div></div>
            <div><span><GlossaryTerm term="hub" placement="left">Hub rank</GlossaryTerm></span><strong>{gene.hub ? `#${gene.hub}` : "—"}</strong></div>
            <div><span><GlossaryTerm term="kme">Module kME</GlossaryTerm></span><strong>{gene.kme?.toFixed(3) || "—"}</strong></div>
            <div><span><GlossaryTerm term="tomDegree">TOM degree</GlossaryTerm></span><strong>{gene.hdDegree}</strong></div>
            <div><span><GlossaryTerm term="program">GNN program</GlossaryTerm></span><strong>{gene.program || "—"}</strong></div>
            <div><span><GlossaryTerm term="regulon" placement="right">Regulon targets</GlossaryTerm></span><strong>{gene.regulonSize || "—"}</strong></div>
            <button onClick={() => setTab("explore")}>Open focused neighborhood</button>
          </section>

          <section className="consensus-panel panel">
            <div className="consensus-head"><div><span className="section-kicker">Cross-model connections</span><h2>Strongly ranked SCENIC arrows supported by another network</h2></div><p>Support counts methods, not confidence. Native TOM, GNN r and SCENIC importance stay separate; no averaged “consensus strength” is created.</p></div>
            <div className="consensus-grid">
              {data.consensusEdges.slice(0, 12).map((edge) => (
                <article key={`${edge.source}-${edge.target}`}>
                  <div className="consensus-pair"><button onClick={() => selectGene(edge.source)}>{edge.source}</button><i>→</i><button onClick={() => selectGene(edge.target)}>{edge.target}</button><strong>{edge.support}/3</strong></div>
                  <div className="consensus-badges">
                    <span className="scenic">SCENIC rank p{Math.round((edge.scenicPercentile || 0) * 100)}</span>
                    {edge.tom !== null && <span>HD TOM {edge.tom.toFixed(3)}</span>}
                    {edge.gnnCorr && <span className={(edge.gnnCorr[ageIndex] || 0) < 0 ? "negative" : "gnn"}>{AGES[ageIndex]} r {(edge.gnnCorr[ageIndex] || 0) >= 0 ? "+" : ""}{edge.gnnCorr[ageIndex].toFixed(3)}{edge.gnnPresent?.[ageIndex] ? " · retained" : " · absent"}</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      )}

      {tab === "explore" && (
        <>
          <section className="hero">
            <div>
              <p className="eyebrow">Indirect flight muscle / Drosophila melanogaster</p>
              <h1>Follow a gene through <em>three network lenses</em> and age.</h1>
              <p className="hero-copy">Click through pooled <GlossaryTerm term="hdwgcna">hdWGCNA</GlossaryTerm> topology, age-specific <GlossaryTerm term="gnn">GNN</GlossaryTerm> graph membership and stringent <GlossaryTerm term="scenic">SCENIC</GlossaryTerm> regulation. Each relationship keeps its native score and interpretation.</p>
            </div>
            <div className="hero-stats">
              <div><strong>{formatNumber(data.meta.hdwgcnaEdges, 0)}</strong><span><GlossaryTerm term="tom">TOM edges</GlossaryTerm></span></div>
              <div><strong>{formatNumber(data.meta.gnnUnionEdges, 0)}</strong><span><GlossaryTerm term="graphEdge">GNN pairs</GlossaryTerm></span></div>
              <div><strong>{data.meta.regulons}</strong><span><GlossaryTerm term="regulon" placement="right">QC-retained regulons</GlossaryTerm></span></div>
            </div>
          </section>

          <section className="explorer-grid">
            <aside className="control-panel panel">
              <form className="gene-search" onSubmit={submitSearch}>
                <label htmlFor="gene-search">Find a gene or regulon</label>
                <div><input id="gene-search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" /><button type="submit">Explore</button></div>
                {query !== selected && suggestions.length > 0 && (
                  <div className="suggestions">
                    {suggestions.map((name) => <button type="button" key={name} onClick={() => selectGene(name)}>{name}<span>{geneMap.get(name)?.module}</span></button>)}
                  </div>
                )}
              </form>

              <div className="control-group">
                <span className="control-label">Evidence layer</span>
                <div className="segmented">
                {(["integrated", "hdwgcna", "gnn", "scenic"] as Layer[]).map((item) => (
                  <button key={item} className={layer === item ? "active" : ""} aria-pressed={layer === item} onClick={() => setLayer(item)}>
                      {item === "integrated" ? "All" : item === "hdwgcna" ? "hdWGCNA" : item === "gnn" ? "GNN" : "SCENIC"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-group compact-control">
                <span className="control-label">Node color</span>
                <div className="segmented">
                  {(["module", "program"] as ColorMode[]).map((mode) => <button key={mode} className={colorMode === mode ? "active" : ""} aria-pressed={colorMode === mode} onClick={() => setColorMode(mode)}>{mode === "module" ? "hdWGCNA module" : "GNN program"}</button>)}
                </div>
              </div>

              <div className="control-group age-control">
                <span className="control-label"><GlossaryTerm term="graphEdge" placement="left">GNN age graph</GlossaryTerm></span>
                <div className="age-rail"><i style={{ width: `${ageIndex * 50}%` }} /></div>
                <div className="age-buttons">
                  {AGES.map((age, index) => <button key={age} className={ageIndex === index ? "active" : ""} aria-pressed={ageIndex === index} onClick={() => setAgeIndex(index)}><b>{age}</b><small>{data.meta.cellsByAge[age].toLocaleString()} cells</small></button>)}
                </div>
              </div>

              <div className="control-group neighbor-control">
                <span className="control-label">Neighborhood <b>{neighborLimit}</b></span>
                <input aria-label="Number of neighbors" type="range" min="6" max="28" value={neighborLimit} onChange={(event) => setNeighborLimit(Number(event.target.value))} />
              </div>

              <div className="legend-box">
                <span><i className="strength-line strong" /> <GlossaryTerm term="strength" placement="left">strong link</GlossaryTerm></span>
                <span><i className="strength-line medium" /> medium link</span>
                <span><i className="strength-line weak" /> weak link</span>
                <span><i className="line gnn" /> GNN age edge</span>
                <span><i className="line scenic" /> SCENIC →</span>
                <span><i className="dot positive" /> + GNN Pearson r</span>
                <span><i className="dot negative" /> − GNN Pearson r</span>
              </div>
            </aside>

            <section className="network-panel panel">
              <div className="panel-heading">
                <div><span className="section-kicker">Local evidence graph</span><h2>{selected}</h2></div>
                <div className="panel-chip"><i style={{ background: colorFor(gene, colorMode) }} />{colorMode === "module" ? gene.module : gene.program || "no program"}</div>
              </div>
              {visualEdges.length ? (
                <NetworkCanvas center={selected} edges={visualEdges} genes={geneMap} ageIndex={ageIndex} tomMedian={data.summary.tom.median} tomP95={data.summary.tom.p95} gnnMedian={graphAge.medianAbsCorrelation} gnnP95={graphAge.p95AbsCorrelation} colorMode={colorMode} onSelect={selectGene} />
              ) : (
                <div className="empty-network"><strong>No {layer === "scenic" ? "regulon" : "network"} edges for {selected}</strong><span>Try the integrated layer or another gene.</span></div>
              )}
            </section>

            <aside className="gene-panel panel">
              <div className="gene-title">
                <span className="gene-avatar" style={{ background: colorFor(gene, colorMode) }}>{selected.slice(0, 2)}</span>
                <div><h2>{selected}</h2><p>{gene.module} · {gene.program || "no GNN program"}{gene.isRegulon ? " · SCENIC TF" : ""}</p></div>
              </div>
              <div className="identity-grid">
                <div><span><GlossaryTerm term="kme" placement="left">module kME</GlossaryTerm></span><strong>{gene.kme === null ? "—" : gene.kme.toFixed(3)}</strong></div>
                <div><span><GlossaryTerm term="hub" placement="right">hub rank</GlossaryTerm></span><strong>{gene.hub ? `#${gene.hub}` : "—"}</strong></div>
                <div><span><GlossaryTerm term="program" placement="left">GNN program</GlossaryTerm></span><strong>{gene.program || "—"}</strong></div>
                <div><span><GlossaryTerm term="membershipConfidence" placement="right">confidence</GlossaryTerm></span><strong>{gene.confidence === null ? "—" : `${(gene.confidence * 100).toFixed(0)}%`}</strong></div>
                <div><span><GlossaryTerm term="graphEdge" placement="left">{AGES[ageIndex]} degree</GlossaryTerm></span><strong>{gene.graph?.[ageIndex]?.degree ?? "—"}</strong></div>
                <div><span><GlossaryTerm term="tf" placement="right">regulators</GlossaryTerm></span><strong>{gene.regulators}</strong></div>
              </div>

              {gene.expression && (
                <div className="mini-section">
                  <div className="mini-heading"><span>Mean normalized expression</span><b>{AGES[ageIndex]}</b></div>
                  <MetricBars values={gene.expression} format={(value) => value.toFixed(2)} />
                  {gene.detection && <div className="detection-line"><GlossaryTerm term="detection" placement="left">Detection</GlossaryTerm>{AGES.map((age, index) => <span key={age} className={gene.undetectedAges.includes(age) ? "undetected" : ""}>{age} {formatDetection(gene.detection?.[index] || 0)}</span>)}</div>}
                </div>
              )}

              {gene.displacement && (
                <div className="mini-section">
                  <div className="mini-heading"><span><GlossaryTerm term="displacement" placement="left">Embedding displacement</GlossaryTerm></span><b>{gene.turnover === null ? "—" : `${Math.round(gene.turnover * 100)}% turnover`}</b></div>
                  <MetricBars values={gene.displacement} labels={["0→25", "25→50", "0→50"]} format={(value) => value.toFixed(2)} />
                </div>
              )}

              {activity ? (
                <div className="mini-section activity-section">
                  <div className="mini-heading"><span><GlossaryTerm term="aucell" placement="left">Regulon activity / AUCell</GlossaryTerm>{activity.qcAffected && <em className="activity-qc-badge">QC flag</em>}</span><b className={trendTone(activity.delta)}>{activity.pattern}</b></div>
                  <MetricBars values={activity.mean} format={(value) => value.toFixed(3)} />
                  <QuartileSummary quartiles={activity.quartiles} />
                  <p><strong>{activity.delta > 0 ? "+" : ""}{activity.delta.toFixed(3)}</strong> D50 − D0 · {gene.regulonSize}{activity.qcAffected ? ` QC-retained of ${activity.rawTargets} raw` : ""} <GlossaryTerm term="motif" placement="right">motif-pruned</GlossaryTerm> targets</p>
                  {activity.qcAffected && <div className="activity-qc-note"><strong><GlossaryTerm term="activityQc" placement="left">Activity QC caveat</GlossaryTerm></strong><span>The network excludes erroneous h/dl target aliases, but this AUCell trajectory was calculated upstream from the raw target set.</span></div>}
                </div>
              ) : (
                <div className="not-regulon">No SCENIC regulon was exported for this gene.</div>
              )}
            </aside>
          </section>

          <section className="detail-grid">
            <div className="connections panel">
              <div className="panel-heading compact"><div><span className="section-kicker">Evidence list</span><h3>Strongest displayed relationships</h3></div><span>{visualEdges.length} links</span></div>
              <div className="connection-list">
                {visualEdges.map((edge, index) => {
                  const partner = edge.source === selected ? edge.target : edge.source;
                  const isActive = resolvedActiveEdge === edge;
                  const correlation = edge.corr?.[ageIndex];
                  return (
                    <button key={`${edge.kind}-${edge.source}-${edge.target}-${index}`} className={isActive ? "active" : ""} aria-pressed={isActive} onClick={() => setActiveEdge(edge)}>
                      <i style={{ background: colorFor(geneMap.get(partner), colorMode) }} />
                      <span><strong>{partner}</strong><small>{edge.kind === "hdwgcna" ? "hdWGCNA co-expression / TOM" : edge.kind === "gnn" ? `${AGES[ageIndex]} retained graph` : `${edge.source} → ${edge.target}`}</small></span>
                      <em className={correlation !== undefined && correlation < 0 ? "negative" : ""}>{edge.kind === "hdwgcna" ? `TOM ${edge.tom?.toFixed(3)}` : edge.kind === "gnn" ? `r ${correlation && correlation > 0 ? "+" : ""}${correlation?.toFixed(3)}` : `rank ${edge.rank || "—"}`}</em>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="edge-inspector panel">
              <div className="panel-heading compact">
                <div><span className="section-kicker">Relationship inspector</span><h3>{activePartner ? `${selected} × ${activePartner}` : "Select a relationship"}</h3></div>
                {resolvedActiveEdge && <span className={`evidence-tag ${resolvedActiveEdge.kind}`}>{resolvedActiveEdge.kind === "hdwgcna" ? "hdWGCNA" : resolvedActiveEdge.kind === "gnn" ? "GNN" : "SCENIC"}</span>}
              </div>
              {resolvedActiveEdge?.kind === "hdwgcna" ? (
                <>
                  <div className="inspector-callout"><span><GlossaryTerm term="tom" placement="left">hdWGCNA co-expression strength</GlossaryTerm></span><strong>{resolvedActiveEdge.tom?.toFixed(4)}</strong><small>Static across age</small></div>
                  <p className="interpretation">This undirected edge is exported from one signed hdWGCNA network fitted to D0, D25 and D50 together. The line does not change with the age control and should not be read as a direct molecular interaction.</p>
                </>
              ) : resolvedActiveEdge?.kind === "gnn" && resolvedActiveEdge.corr ? (
                <>
                  <div className="inspector-callout gnn"><span><GlossaryTerm term="pearson" placement="left">{AGES[ageIndex]} signed Pearson r</GlossaryTerm></span><strong>{resolvedActiveEdge.corr[ageIndex] >= 0 ? "+" : ""}{resolvedActiveEdge.corr[ageIndex].toFixed(4)}</strong><small>{resolvedActiveEdge.transition}</small></div>
                  <div className="chart-title"><span>Pair correlation by age</span><small><GlossaryTerm term="appeared" placement="right">retained graph: {resolvedActiveEdge.present?.map((value) => value ? "yes" : "no").join(" / ")}</GlossaryTerm></small></div>
                  <MetricBars values={resolvedActiveEdge.corr} signed format={(value) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`} />
                  <p className="interpretation">The three bars are signed correlations; graph membership uses absolute correlation plus top-15 ranking. A pair can leave the graph even when its correlation changes only modestly because neighboring ranks compete.</p>
                </>
              ) : resolvedActiveEdge?.kind === "scenic" ? (
                <>
                  <div className="inspector-callout scenic"><span><GlossaryTerm term="regulonWeight" placement="left">Raw importance</GlossaryTerm></span><strong>{resolvedActiveEdge.weight?.toFixed(5)}</strong><small>{resolvedActiveEdge.source} → {resolvedActiveEdge.target} · retained-regulator rank {resolvedActiveEdge.rank || "—"}</small></div>
                  {activeActivity && <><div className="chart-title"><span><GlossaryTerm term="aucell" placement="left">{resolvedActiveEdge.source} AUCell activity</GlossaryTerm>{activeActivity.qcAffected && <em className="activity-qc-badge">QC flag</em>}</span><small>{activeActivity.pattern}</small></div><MetricBars values={activeActivity.mean} format={(value) => value.toFixed(3)} />{activeActivity.qcAffected && <div className="activity-qc-note"><strong><GlossaryTerm term="activityQc" placement="left">Activity QC caveat</GlossaryTerm></strong><span>AUCell used {activeActivity.rawTargets} raw targets upstream; the displayed network removes the erroneous h/dl aliases.</span></div>}</>}
                  <p className="interpretation">Line strength uses this TF&apos;s rank among retained regulators for the same target because raw custom-gradient-boosting importance is not safely comparable across targets. Age change is the regulator&apos;s AUCell activity, not an edge coefficient.</p>
                </>
              ) : <div className="empty-inspector">Choose a relationship from the list to compare its evidence.</div>}
              {activePartner && <button className="recenter-button" onClick={() => selectGene(activePartner)}>Recenter on {activePartner} →</button>}
            </div>
          </section>
        </>
      )}

      {tab === "gnn" && (
        <section className="section-page gnn-page">
          <div className="section-hero">
            <p className="eyebrow">GNN / shared variational graph autoencoder</p>
            <h1>The gene graph is extensively rewired across age-associated samples.</h1>
            <p>Explore six unsupervised <GlossaryTerm term="program">embedding programs</GlossaryTerm>, exact age-specific <GlossaryTerm term="graphEdge">retained edges</GlossaryTerm>, high-displacement gene paths, and model diagnostics. This is an age-comparative analysis—not a temporal model—and <GlossaryTerm term="sampleConfounding">age remains confounded with sample</GlossaryTerm>.</p>
          </div>

          <div className="gnn-metric-strip panel">
            <div><span>Union-positive pairs</span><strong>{data.meta.gnnUnionEdges.toLocaleString()}</strong><small>across D0 / D25 / D50</small></div>
            <div><span>Lowest cross-age overlap</span><strong>{(Math.min(...data.graphOverlap.map((item) => item.jaccard)) * 100).toFixed(1)}%</strong><small><GlossaryTerm term="edgeJaccard">D0–D50 edge Jaccard</GlossaryTerm></small></div>
            <div><span>Mean program confidence</span><strong>{(data.summary.gnn.meanMembershipConfidence * 100).toFixed(1)}%</strong><small><GlossaryTerm term="membershipConfidence">subsample agreement</GlossaryTerm></small></div>
            <div><span>GNN ↔ module agreement</span><strong>ARI {data.summary.crossMethod.programModuleAriNonGrey.toFixed(3)}</strong><small><GlossaryTerm term="ari">low, by design-independent methods</GlossaryTerm></small></div>
          </div>

          <div className="graph-age-grid">
            {data.graphAges.map((snapshot, index) => (
              <button key={snapshot.age} className={`graph-age-card panel ${ageIndex === index ? "active" : ""}`} aria-pressed={ageIndex === index} onClick={() => setAgeIndex(index)}>
                <div><span>{snapshot.age}</span><b>{data.meta.cellsByAge[snapshot.age].toLocaleString()} IFM cells</b></div>
                <strong>{snapshot.edges.toLocaleString()}</strong><small>retained undirected edges</small>
                <dl>
                  <div><dt>median |r|</dt><dd>{snapshot.medianAbsCorrelation.toFixed(4)}</dd></div>
                  <div><dt>median degree</dt><dd>{snapshot.medianDegree.toFixed(0)}</dd></div>
                  <div><dt>isolated genes</dt><dd>{snapshot.isolated}</dd></div>
                  <div><dt>giant component</dt><dd>{snapshot.giantComponentPercent.toFixed(1)}%</dd></div>
                </dl>
              </button>
            ))}
          </div>

          <div className="gnn-visual-grid">
            <article className="panel trajectory-panel">
              <div className="panel-heading compact"><div><span className="section-kicker">Age-snapshot embedding</span><h3>34 largest D0→D50 gene movements</h3></div><span>line width = <GlossaryTerm term="displacement" placement="right">displacement</GlossaryTerm></span></div>
              <AgeTrajectoryCanvas genes={trajectoryGenes} onSelect={selectGene} />
              <p className="panel-footnote">Paths connect the joint D0, D25 and D50 snapshot UMAP positions. Geometry is useful for comparison, but exact axis distances are not interaction strength.</p>
            </article>
            <article className="panel gnn-umap-panel">
              <div className="panel-heading compact"><div><span className="section-kicker">Consensus embedding</span><h3>All genes, colored by program</h3></div><span>{data.meta.gnnGenes.toLocaleString()} genes</span></div>
              <UmapCanvas genes={data.genes} projection="gnn" colorMode="program" onSelect={selectGene} />
              <div className="module-legend">{data.programs.map((program) => <span key={program.id}><i style={{ background: PROGRAM_COLORS[program.id] }} />{program.id} · {program.genes}</span>)}</div>
            </article>
          </div>

          <div className="section-subhead"><div><span className="section-kicker">Unsupervised structure</span><h2>Six stable programs, with distinct change profiles</h2></div><p>Program labels are independent of hdWGCNA module labels. The low cross-method ARI/NMI is preserved as an interpretable finding rather than forced into a consensus cluster.</p></div>
          <div className="program-grid">
            {data.programs.map((program) => (
              <article className="program-card panel" key={program.id}>
                <div className="program-card-head"><i style={{ background: PROGRAM_COLORS[program.id] }} /><div><span>{program.percent.toFixed(1)}% of genes</span><h3>{program.id}</h3></div><strong>{program.genes}</strong></div>
                <div className="program-diagnostics"><span><b>{program.meanSilhouette.toFixed(3)}</b><GlossaryTerm term="silhouette">mean silhouette</GlossaryTerm></span><span><b>{(program.meanConfidence * 100).toFixed(1)}%</b><GlossaryTerm term="membershipConfidence">confidence</GlossaryTerm></span><span><b>{program.medianDisplacement.toFixed(2)}</b><GlossaryTerm term="displacement">median D0→D50</GlossaryTerm></span></div>
                <p>{program.dominantModules}</p>
                <div className="program-genes"><span>Centroid-near genes</span>{program.representatives.map((name) => <button key={name} onClick={() => selectGene(name)}>{name}</button>)}</div>
                <div className="program-genes dynamic"><span>Largest displacement</span>{program.topDisplacement.map((name) => <button key={name} onClick={() => selectGene(name)}>{name}</button>)}</div>
              </article>
            ))}
          </div>

          <div className="agreement-panel panel">
            <div className="agreement-copy"><span className="section-kicker">Independent partitions</span><h2>Programs cut across hdWGCNA modules.</h2><p>Counts show exact gene assignments. Non-grey <GlossaryTerm term="ari">ARI = {data.summary.crossMethod.programModuleAriNonGrey.toFixed(3)}</GlossaryTerm> and <GlossaryTerm term="nmi">NMI = {data.summary.crossMethod.programModuleNmiNonGrey.toFixed(3)}</GlossaryTerm>, so GNN programs and co-expression modules should not share one color legend or be treated as equivalent.</p></div>
            <div className="agreement-matrix" style={{ gridTemplateColumns: `68px repeat(${matrixModules.length}, minmax(62px, 1fr))` }}>
              <span />
              {matrixModules.map((module) => <b key={module}>{module}</b>)}
              {data.programs.flatMap((program) => [
                <b className="row-label" key={`${program.id}-label`} style={{ color: PROGRAM_COLORS[program.id] }}>{program.id}</b>,
                ...matrixModules.map((module) => {
                  const value = data.programModuleMatrix[program.id]?.[module] || 0;
                  return <span key={`${program.id}-${module}`} style={{ background: `rgba(102,184,255,${0.04 + (value / matrixMaximum) * 0.5})` }}><strong>{value}</strong><small>{((value / program.genes) * 100).toFixed(0)}%</small></span>;
                }),
              ])}
            </div>
          </div>

          <div className="gnn-table-grid">
            <article className="panel dynamic-table-panel">
              <div className="panel-heading compact"><div><span className="section-kicker">Retained-graph transitions</span><h3>Largest D0→D50 membership changes</h3></div><span><GlossaryTerm term="appeared">appeared / disappeared</GlossaryTerm></span></div>
              <div className="dynamic-edge-head"><span>Gene pair</span><span>State</span><span>D0 r</span><span>D25 r</span><span>D50 r</span></div>
              <div className="dynamic-edge-list">
                {data.dynamicEdges.slice(0, 30).map((edge) => (
                  <div className="dynamic-edge-row" key={`${edge.a}-${edge.b}`}>
                    <span><button onClick={() => selectGene(edge.a)}>{edge.a}</button><i>×</i><button onClick={() => selectGene(edge.b)}>{edge.b}</button></span>
                    <b className={edge.transition.startsWith("appeared") ? "up" : "down"}>{edge.transition.replace(" by D50", "")}</b>
                    {edge.corr.map((value, index) => <code key={index} className={value < 0 ? "down" : ""}>{value >= 0 ? "+" : ""}{value.toFixed(3)}</code>)}
                  </div>
                ))}
              </div>
            </article>

            <article className="panel decoder-panel">
              <div className="panel-heading compact"><div><span className="section-kicker">Model-score candidates</span><h3>Largest decoder-logit shifts</h3></div><div className="segmented compact-segmented">{(["decrease", "increase"] as const).map((direction) => <button key={direction} className={candidateDirection === direction ? "active" : ""} aria-pressed={candidateDirection === direction} onClick={() => setCandidateDirection(direction)}>{direction}</button>)}</div></div>
              <p className="table-note"><GlossaryTerm term="decoder">Standardized decoder logits</GlossaryTerm> are model scores, separate from the retained graph and Pearson r. The strongest gain tail is rich in rRNA/pseudogene pairs, so inspect gene identity before assigning regulatory meaning.</p>
              <div className="decoder-list">
                {candidateRows.map((candidate) => (
                  <div className="decoder-row" key={`${candidate.direction}-${candidate.rank}`}>
                    <span className="decoder-rank">#{candidate.rank}</span>
                    <span><button onClick={() => selectGene(candidate.a)}>{candidate.a}</button><i>×</i><button onClick={() => selectGene(candidate.b)}>{candidate.b}</button><small>{candidate.programA} / {candidate.programB}</small></span>
                    <strong className={candidate.delta < 0 ? "down" : "up"}>{candidate.delta > 0 ? "+" : ""}{candidate.delta.toFixed(2)}</strong>
                    <small>r {candidate.corr[0].toFixed(2)} → {candidate.corr[2].toFixed(2)}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="model-quality panel">
            <div className="quality-intro"><span className="section-kicker">Model reading guide</span><h2>Random negatives look easier than correlation-matched pairs.</h2><p>Link prediction asks whether the VGAE recovers its own constructed graph. Against <GlossaryTerm term="hardNegative">correlation-matched hard negatives</GlossaryTerm>, GNN AUROC is near or below chance, so the atlas avoids “biologically validated prediction” language.</p></div>
            <div className="quality-grid">
              {AGES.map((age) => {
                const random = data.linkEvaluation.find((item) => item.age === age && item.type === "random_negative");
                const hard = data.linkEvaluation.find((item) => item.age === age && item.type === "correlation_matched_hard_negative");
                return <div key={age}><span>{age}</span><strong>AP {random?.ap?.toFixed(3)}</strong><small>random absent pairs</small><strong className="hard">AP {hard?.gnnAp?.toFixed(3)}</strong><small>correlation-matched</small></div>;
              })}
            </div>
          </div>
        </section>
      )}

      {tab === "regulons" && (
        <section className="section-page">
          <div className="section-hero"><p className="eyebrow">SCENIC / {data.meta.regulons} QC-retained of {data.meta.rawRegulons} raw regulons</p><h1>Regulatory activity shifts across age-associated metacells.</h1><p>Rank <GlossaryTerm term="tf">transcription-factor</GlossaryTerm> <GlossaryTerm term="regulon">regulons</GlossaryTerm> by <GlossaryTerm term="aucell">AUCell</GlossaryTerm> change and jump into motif-pruned target networks. QC excludes the raw <code>h</code>/<code>dl</code> source regulons and {data.meta.excludedScenicTargetEdges} erroneous target edges. Because activity was scored upstream, {data.meta.activityQcRegulons} affected trajectories retain their raw AUCell values and carry an <GlossaryTerm term="activityQc">activity-QC flag</GlossaryTerm>.</p></div>
          <div className="insight-strip">
            <div><span>Largest decline</span><strong>{data.tfTrends.find((trend) => trend.delta < 0)?.g}</strong><small>{data.tfTrends.find((trend) => trend.delta < 0)?.delta.toFixed(3)} AUCell</small></div>
            <div><span>Largest increase</span><strong>{[...data.tfTrends].sort((a, b) => b.delta - a.delta)[0].g}</strong><small>State-specific activity</small></div>
            <div><span>Cross-method hubs</span><strong>{data.summary.crossMethod.regulonHubs}</strong><small>SCENIC TFs among hdWGCNA top hubs</small></div>
          </div>
          <div className="trend-controls panel"><span>Trajectory pattern</span><div className="segmented">{["all", "rising", "falling", "D25 peak", "D25 dip"].map((item) => <button key={item} className={trendFilter === item ? "active" : ""} aria-pressed={trendFilter === item} onClick={() => setTrendFilter(item)}>{item}</button>)}</div></div>
          <div className="trend-table panel">
            <div className="trend-head"><span>Regulon</span><span>Module</span><span>D0</span><span>D25</span><span>D50</span><span>Δ D50−D0</span><span>Pattern</span><span>Targets</span></div>
            {filteredTrends.map((trend) => (
              <button className="trend-row" key={trend.g} onClick={() => selectGene(trend.g)}>
                <span className="trend-name"><i style={{ background: colorFor(geneMap.get(trend.g)) }} /><strong>{trend.g}</strong>{trend.hub && <em>hub #{trend.hub}</em>}{trend.qcAffected && <em className="activity-qc-badge">activity QC</em>}</span>
                <span>{trend.module} · {trend.program}</span>
                {trend.mean.map((value, index) => <span key={index}>{value.toFixed(3)}</span>)}
                <span className={trendTone(trend.delta)}>{trend.delta > 0 ? "+" : ""}{trend.delta.toFixed(3)}</span>
                <span><b className={`pattern ${trendTone(trend.delta)}`}>{trend.pattern}</b></span>
                <span className="target-count">{trend.targets}{trend.qcAffected && <small>of {trend.rawTargets} raw</small>}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "modules" && (
        <section className="section-page">
          <div className="section-hero"><p className="eyebrow">hdWGCNA / pooled signed network</p><h1>Five connected IFM modules, plus grey.</h1><p>Explore <GlossaryTerm term="module">module</GlossaryTerm> size, <GlossaryTerm term="kme">membership</GlossaryTerm>, <GlossaryTerm term="hub">hub genes</GlossaryTerm> and functional <GlossaryTerm term="enrichment">enrichment</GlossaryTerm>. The exported gene-space <GlossaryTerm term="umap">UMAP</GlossaryTerm> used module labels during embedding, so separation is partly label-guided and is not independent validation.</p></div>
          <div className="module-layout">
            <div className="umap-panel panel"><div className="panel-heading compact"><div><span className="section-kicker">Label-guided projection</span><h3>Gene-space UMAP</h3></div><span>{data.genes.filter((item) => item.hdUmap).length.toLocaleString()} non-grey genes</span></div><UmapCanvas genes={data.genes} projection="hdwgcna" colorMode="module" onSelect={selectGene} /><div className="module-legend">{data.modules.filter((module) => module.id !== "grey").map((module) => <span key={module.id}><i style={{ background: MODULE_COLORS[module.color] }} />{module.id}</span>)}</div></div>
            <div className="module-cards">
              {data.modules.map((module) => (
                <article className="module-card panel" key={module.id}>
                  <div className="module-card-head"><i style={{ background: MODULE_COLORS[module.color] }} /><div><h3>{module.id}</h3><span>{module.genes} genes · median <GlossaryTerm term="kme">kME</GlossaryTerm> {module.medianKME.toFixed(3)}</span></div><b>{module.regulons} TFs</b></div>
                  <div className="module-size"><i style={{ width: `${(module.genes / Math.max(...data.modules.map((item) => item.genes))) * 100}%`, background: MODULE_COLORS[module.color] }} /></div>
                  {module.hubs.length > 0 && <div className="hub-list"><span>Top hubs</span>{module.hubs.slice(0, 5).map((hub) => <button key={hub.g} onClick={() => selectGene(hub.g)}>{hub.g}<em>{hub.kme.toFixed(2)}</em></button>)}</div>}
                  <div className="program-mix"><span>GNN program mix</span>{Object.entries(module.programMix).map(([program, count]) => <i key={program} title={`${program}: ${count} genes`} style={{ width: `${(count / module.genes) * 100}%`, background: PROGRAM_COLORS[program] }} />)}</div>
                  {module.enrichment.length > 0 && <div className="enrichment-list"><span><GlossaryTerm term="enrichment" placement="left">Top enrichment</GlossaryTerm></span>{module.enrichment.slice(0, 3).map((term) => <div key={term.term}><strong>{term.term}</strong><small>{term.source} · p<sub>adj</sub> {formatP(term.p)} · overlap n={term.genes}</small></div>)}</div>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "methods" && (
        <section className="section-page methods-page">
          <div className="section-hero"><p className="eyebrow">Provenance before interpretation</p><h1>Three network lenses, no blended score.</h1><p>The atlas preserves pooled hdWGCNA topology, age-specific GNN graph membership, and SCENIC TF→target inference as distinct evidence. Hover unfamiliar terms for definitions.</p></div>
          <div className="method-grid">
            <article className="method-card panel"><span className="method-number">01</span><h2><GlossaryTerm term="hdwgcna" placement="left">hdWGCNA</GlossaryTerm></h2><p>A single <GlossaryTerm term="signed">signed network</GlossaryTerm> was built from D0, D25 and D50 <GlossaryTerm term="ifm">indirect flight muscle</GlossaryTerm> cells together. Genes expressed in at least 5% of cells were retained, listed sex-associated genes excluded, and <GlossaryTerm term="softPower">soft power 7</GlossaryTerm> used to construct the <GlossaryTerm term="tom">topological overlap matrix</GlossaryTerm>.</p><dl><div><dt>Gene universe</dt><dd>{data.meta.hdwgcnaGenes.toLocaleString()}</dd></div><div><dt>Exported TOM edges</dt><dd>{data.meta.hdwgcnaEdges.toLocaleString()}</dd></div><div><dt>TOM threshold</dt><dd>&gt; {data.summary.tom.threshold.toFixed(2)}</dd></div><div><dt>Modules</dt><dd>5 + <GlossaryTerm term="grey" placement="right">grey</GlossaryTerm></dd></div></dl></article>
            <article className="method-card panel"><span className="method-number">02</span><h2><GlossaryTerm term="gnn">GNN / VGAE</GlossaryTerm></h2><p>A shared encoder learns 32-dimensional gene embeddings from three separately constructed age graphs. Each gene nominates up to 15 partners by absolute <GlossaryTerm term="pearson">Pearson correlation</GlossaryTerm> with a 0.05 floor; graph membership is unsigned, while signed r remains visible.</p><dl><div><dt>Genes</dt><dd>{data.meta.gnnGenes.toLocaleString()}</dd></div><div><dt>Union graph pairs</dt><dd>{data.meta.gnnUnionEdges.toLocaleString()}</dd></div><div><dt>Programs</dt><dd>{data.meta.gnnPrograms}</dd></div><div><dt>Selected silhouette</dt><dd>{data.summary.gnn.silhouette.toFixed(3)}</dd></div></dl></article>
            <article className="method-card panel"><span className="method-number">03</span><h2><GlossaryTerm term="scenic">SCENIC</GlossaryTerm></h2><p><GlossaryTerm term="customGbt">Custom per-target gradient boosting</GlossaryTerm> candidates were restricted to positive co-expression, pruned with the Drosophila <GlossaryTerm term="motif">motif-ranking</GlossaryTerm> database at <GlossaryTerm term="nes">NES ≥ 3.0</GlossaryTerm>, and scored per <GlossaryTerm term="metacell">metacell</GlossaryTerm> with <GlossaryTerm term="aucell">AUCell</GlossaryTerm>. Post-export QC removes h/dl source regulons and target aliases; upstream activity values for affected regulons are flagged rather than recomputed.</p><dl><div><dt>Raw / retained regulons</dt><dd>{data.meta.rawRegulons} / {data.meta.regulons}</dd></div><div><dt>Excluded source regulons</dt><dd>{data.meta.excludedRegulons.join(", ")}</dd></div><div><dt>Excluded target edges</dt><dd>{data.meta.excludedScenicTargetEdges}</dd></div><div><dt><GlossaryTerm term="activityQc" placement="left">Activity-QC flags</GlossaryTerm></dt><dd>{data.meta.activityQcRegulons}</dd></div><div><dt>Median QC targets</dt><dd>{data.summary.regulonSize.median}</dd></div><div><dt>Metacells</dt><dd>{data.meta.metacells.toLocaleString()}</dd></div></dl></article>
            <article className="method-card panel accent"><span className="method-number">04</span><h2>Integrated view</h2><p>Teal undirected lines are hdWGCNA co-expression (TOM); blue/orange undirected lines are positive/negative age-specific GNN r; red arrows are SCENIC. Solid, dashed and dotted textures are method-specific <GlossaryTerm term="strength">display tiers</GlossaryTerm>, never a merged interaction score.</p><dl><div><dt>Edges shared by all 3</dt><dd>{data.summary.crossMethod.allThreeEdges.toLocaleString()}</dd></div><div><dt>Genes covered by all 3</dt><dd>{data.summary.crossMethod.tripleModelGenes.toLocaleString()}</dd></div><div><dt>Program ↔ module ARI</dt><dd>{data.summary.crossMethod.programModuleAriNonGrey.toFixed(3)}</dd></div><div><dt>GNN checks passed</dt><dd>{data.summary.integrity.passed}/{data.summary.integrity.checks}</dd></div></dl></article>
          </div>
          <div className="caveat-panel panel"><div><span className="section-kicker">Interpretation guide</span><h2>What the lines do—and do not—mean</h2></div><ol>{[...data.notes, "Age means, deltas and interquartile ranges are descriptive summaries; no biological-replicate age-difference hypothesis test or population-level confidence interval is represented."].map((note, index) => <li key={note}><b>{String(index + 1).padStart(2, "0")}</b><span>{note}</span></li>)}</ol></div>
          <div className="reference-panel panel">
            <div className="reference-intro"><span className="section-kicker">Verified reading guide</span><h2>Know which values are exported, derived or inferred.</h2><p>Definitions were checked against the primary method papers and package documentation. These labels prevent a visual encoding from being mistaken for a new biological statistic.</p></div>
            <div className="evidence-levels">
              <div><i className="exported" /><span>Exported</span><strong>TOM, kME, modules, age graphs, programs, regulons and AUCell</strong></div>
              <div><i className="derived" /><span>Display-derived</span><strong>Method-specific line tiers and cross-table overlaps</strong></div>
              <div><i className="inferred" /><span>Model inference</span><strong>GNN embeddings/decoder logits and SCENIC TF→target links</strong></div>
            </div>
            <div className="primary-references">
              <a href="https://smorabit.github.io/hdWGCNA/articles/basic_tutorial.html" target="_blank" rel="noreferrer"><span>hdWGCNA</span><strong>Single-cell tutorial ↗</strong></a>
              <a href="https://smorabit.github.io/hdWGCNA/articles/network_visualizations.html" target="_blank" rel="noreferrer"><span>hdWGCNA</span><strong>Network visualization ↗</strong></a>
              <a href="https://www.nature.com/articles/nmeth.4463" target="_blank" rel="noreferrer"><span>Nature Methods</span><strong>Original SCENIC paper ↗</strong></a>
              <a href="https://arxiv.org/abs/1611.07308" target="_blank" rel="noreferrer"><span>VGAE</span><strong>Variational graph auto-encoders ↗</strong></a>
              <a href="https://pyscenic.readthedocs.io/en/latest/" target="_blank" rel="noreferrer"><span>pySCENIC</span><strong>Workflow documentation ↗</strong></a>
              <a href="https://bioconductor.org/packages/release/bioc/html/AUCell.html" target="_blank" rel="noreferrer"><span>Bioconductor</span><strong>AUCell documentation ↗</strong></a>
              <a href="https://biit.cs.ut.ee/gprofiler/page/docs" target="_blank" rel="noreferrer"><span>g:Profiler</span><strong>Enrichment statistics ↗</strong></a>
            </div>
          </div>
        </section>
      )}

      <footer><div><strong>IFM / Network Atlas</strong><span>Data from GNN_output, HDWGCNA_output and SCENIC_output</span></div><p>No sign-in · exploratory evidence · not causal validation</p></footer>
    </main>
  );
}
