import { LearningCard, Comment, Quiz } from "./types";

/**
 * Normalizes subject classification based on parsed input keywords
 */
export function classifySubject(topic: string): {
  subject: string;
  animationType: 'orbital' | 'timeline' | 'reaction' | 'geometry' | 'matrix' | 'dna_helix';
  notation: string;
  creator: string;
} {
  const norm = topic.toLowerCase();

  // 1. Biology & Chemistry
  if (
    norm.includes("bio") || norm.includes("dna") || norm.includes("gene") || norm.includes("cell") || 
    norm.includes("organ") || norm.includes("plant") || norm.includes("photosynthe") || norm.includes("brain") ||
    norm.includes("neuron") || norm.includes("chem") || norm.includes("acid") || norm.includes("enzym") ||
    norm.includes("molecule") || norm.includes("protein") || norm.includes("virus") || norm.includes("evolution")
  ) {
    return {
      subject: "Biology & Chemistry",
      animationType: norm.includes("dna") || norm.includes("gene") ? "dna_helix" : "reaction",
      notation: "C₆H₁₂O₆ + 6 O₂ ➔ 6 CO₂ + 6 H₂O + ATP",
      creator: "@biochem_pioneer"
    };
  }

  // 2. Math & Computer Science
  if (
    norm.includes("math") || norm.includes("code") || norm.includes("comput") || norm.includes("binary") ||
    norm.includes("algorithm") || norm.includes("prime") || norm.includes("crypt") || norm.includes("security") ||
    norm.includes("ai") || norm.includes("neuron") || norm.includes("logic") || norm.includes("sorting") ||
    norm.includes("graph") || norm.includes("geometry") || norm.includes("data") || norm.includes("cyber")
  ) {
    return {
      subject: "Math & Computer Science",
      animationType: norm.includes("geometry") ? "geometry" : "matrix",
      notation: "T(N) = 2T(N/2) + O(N) ➔ O(N LOG N)",
      creator: "@turing_mind"
    };
  }

  // 3. World History
  if (
    norm.includes("histor") || norm.includes("alexandria") || norm.includes("roman") || norm.includes("gree") ||
    norm.includes("ancient") || norm.includes("empire") || norm.includes("war") || norm.includes("civil") ||
    norm.includes("revolution") || norm.includes("dynasty") || norm.includes("king") || norm.includes("medieval") ||
    norm.includes("century") || norm.includes("archaeo") || norm.includes("culture")
  ) {
    return {
      subject: "World History",
      animationType: "timeline",
      notation: "CHRONO COORD: Δt = -2250 YEARS",
      creator: "@chronicles_unlocked"
    };
  }

  // Default: Space & Physics
  return {
    subject: "Space & Physics",
    animationType: "orbital",
    notation: "iћ(∂/∂t)Ψ(x,t) = ĤΨ(x,t)",
    creator: "@quantum_cosmology"
  };
}

/**
 * Generates card parts based on keyword mappings, with safe procedurial fallbacks
 */
export function generateClientSideCard(topic: string, subjectPreset?: string): LearningCard {
  const cleanTopic = topic.trim();
  const cappedTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  
  const classification = classifySubject(cappedTopic);
  const subject = subjectPreset && subjectPreset !== "all" ? subjectPreset : classification.subject;
  const animationType = classification.animationType;
  const backgroundNotation = classification.notation;
  const creator = classification.creator;

  // Let's create smart matching contents
  let content = "";
  let detailedTheory = "";
  let hashtags: string[] = [subject.toLowerCase().replace(/[^a-z0-9]/g, ""), "curio", "synthesized", "academics"];
  let quiz: Quiz = {
    question: "",
    options: [],
    correctAnswerIndex: 0,
    explanation: ""
  };

  // Generate specialized content for matching topics
  const norm = cleanTopic.toLowerCase();
  
  if (norm.includes("quantum") || norm.includes("schrodinger")) {
    content = `Enter the realm of the extremely small, where particles exist as waves of possibilities. At this scale, objects can be in two states simultaneously—a status known as quantum superposition. Only upon measurement does this envelope collapse into static reality.`;
    detailedTheory = `Superposition is governed by the Schrödinger Equation, which maps the continuous evolution of wavefunctions. In physical systems, particle pathways interfere constructively or destructively until decoherence, caused by environmental interaction or measurement actions (Copenhagen interpretation), restricts observation to discrete eigenvalues.`;
    quiz = {
      question: "Which mathematical construct describes the probability distribution of a quantum observer's system?",
      options: [
        "The continuous Newtonian vector field",
        "The complex-valued spatial wave function Psi",
        "The thermodynamic temperature gradient",
        "The singular gravitational coordinate locus"
      ],
      correctAnswerIndex: 1,
      explanation: "The wave function (Psi) describes the quantum state of a particle and provides the probability amplitude for physical observables."
    };
  } 
  else if (norm.includes("fourier") || norm.includes("transform") || norm.includes("signal")) {
    content = `The Fourier Transform is the ultimate mathematical analyzer, acting as an auditory prism. It takes a complex, messy signal—like a chord played on a piano—and mathematically disassembles it into its constituent individual pure frequencies of sine and cosine waves.`;
    detailedTheory = `The Fourier transform converts an arbitrary continuous function from the time domain into the frequency domain via integration across complex exponentials. It projects signals onto an orthogonal basis of sinusoids, allowing signal processing pipelines to apply bandpass filters and compression algorithms with high numeric efficiency.`;
    quiz = {
      question: "What physical representation is mapped on the horizontal x-axis of a Fourier Transform chart?",
      options: [
        "Continuous time increments",
        "Individual wave frequencies (Hertz)",
        "Gravitational amplitude",
        "Absolute ambient temperature"
      ],
      correctAnswerIndex: 1,
      explanation: "The Fourier transform translates data from the time domain (where space or time is the axis) into the frequency domain, where frequency is the horizontal axis."
    };
  }
  else if (norm.includes("ai") || norm.includes("neural") || norm.includes("intelligence") || norm.includes("machine learning")) {
    content = `Deep neural networks are loosely inspired by the biological mesh of the human brain. By running millions of inputs through matrices of interconnected nodes, the model tunes internal values ('weights') via calculus. Gradually, it learns complex abstract features to generate text, classify images, and reason.`;
    detailedTheory = `Neural networks minimize a custom multi-dimensional cost function using gradient descent algorithms. Backpropagation utilizes the mathematical chain rule to calculate the partial derivatives of the cost relative to every localized weight. This weight correction propagates backward across hidden layers, establishing structured pattern filters.`;
    quiz = {
      question: "Which calculus mechanism allows neural networks to backward-propagate cost corrections through multi-hidden layers?",
      options: [
        "Taylor series expansions",
        "The mathematical Chain Rule for composite derivatives",
        "The Riemann summation of definite integrals",
        "Gauss-Jordan row eliminations"
      ],
      correctAnswerIndex: 1,
      explanation: "The chain rule calculates the derivative of composite local nodes, enabling the propagation of gradient corrections backward from output to initial input weights."
    };
  }
  else if (norm.includes("dna") || norm.includes("gene") || norm.includes("crispr")) {
    content = `Deoxyribonucleic acid (DNA) is the biological hard drive storing instructions for almost every living creature. Made of four chemical base letters, this double-helix software is transcribed and translated every second inside you to build proteins, direct cells, and pass along heredity inheritance.`;
    detailedTheory = `DNA base-pairing obeys Watson-Crick rules, matching Adenine with Thymine (2 hydrogen bonds) and Cytosine with Guanine (3 hydrogen bonds). The primary ladder is unwound by helicase during transcription, allowing RNA polymerase to synthesize messenger RNA, which is later translated by ribosomes into complex chemical polypeptide chains.`;
    quiz = {
      question: "Which of the following describes the accurate base pairing ratio inside double-stranded DNA?",
      options: [
        "Adenine is linked to Cytosine, while Thymine links to Guanine",
        "Adenine is linked to Thymine, while Cytosine links to Guanine",
        "Uracil is linked to Guanine, while Cytosine links to Adenine",
        "Ribose molecules form double covalent bonds to the nitrogen bases"
      ],
      correctAnswerIndex: 1,
      explanation: "Adenine pair-bonds exclusively with Thymine, and Cytosine pair-bonds exclusively with Guanine across the double helix ladder."
    };
  }
  else if (norm.includes("rome") || norm.includes("caesar") || norm.includes("empire")) {
    content = `The magnificent rise and eventual fall of Roman society is a historical masterclass. From a small agricultural republic in Italy, Rome expanded to govern the entire Mediterranean basin. Its advanced infrastructure, civil engineering, and specialized military tactics created a unified cultural empire.`;
    detailedTheory = `Rome transitioned from Republic to Empire following Julius Caesar's crossing of the Rubicon in 49 BC and Augustus's consolidation in 27 BC. The empire's resilience stemmed from organized provincial administration, civil law codification, and advanced engineering (aqueducts, asphalt concrete, arches), but fractured under economic inflation, external pressures, and division in 285 AD.`;
    quiz = {
      question: "Which leader's consolidation of singular executive authority officially marked the transition from Roman Republic to Roman Empire in 27 BC?",
      options: [
        "Julius Caesar",
        "Augustus Caesar (Octavian)",
        "Marcus Aurelius",
        "Constantine the Great"
      ],
      correctAnswerIndex: 1,
      explanation: "Octavian received the title of Augustus in 27 BC, establishing the Roman Principate and formally initiating the imperial administration era."
    };
  }
  else {
    // Elegant parameterized procedural fallback
    content = `The study of ${cappedTopic} represents a vital frontier of academic inquiry. Analyzing this concept uncovers the fundamental mechanics governing our physical systems and historic structures. Each dimension reveals how complex variables interact to forge the world we observe.`;
    
    detailedTheory = `Underlying the mechanics of ${cleanTopic} is a balance of systemic feedback loops and structural principles. Researchers model these dynamics using quantitative calculations and strict empirical standards. This framework allows engineers and historians to predict behaviors under extreme scales, expanding our scientific margins.`;
    
    quiz = {
      question: `Which critical factor primarily determines the stability and performance of ${cleanTopic} during high-scale operations?`,
      options: [
        "Eliminating all molecular and thermodynamic properties",
        "The accurate balance of systemic variables and environmental constraints",
        "Reducing mathematical constants to zero metrics",
        "Exclusively utilizing external analog indicators"
      ],
      correctAnswerIndex: 1,
      explanation: `Systemic balance under constraint governs the functional integrity of ${cleanTopic}, keeping variables bounded within safe, stable operating regions.`
    };
  }

  // Build hashtags
  const topicTag = cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (topicTag && !hashtags.includes(topicTag)) {
    hashtags.unshift(topicTag);
  }

  // Create returning card
  return {
    id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    subject,
    title: cappedTopic,
    creator,
    hashtags,
    content,
    detailedTheory,
    backgroundNotation,
    mediaType: "video_simulation",
    animationType,
    quiz,
    likes: Math.floor(Math.random() * 800) + 120,
    bookmarks: Math.floor(Math.random() * 300) + 40,
    shares: Math.floor(Math.random() * 150) + 10,
    comments: [
      {
        id: `com_s1_${Date.now()}`,
        username: "academic_quest",
        text: `How do we formulate standard boundary proofs for ${cappedTopic}?`,
        likes: 12,
        timestamp: "Just now"
      },
      {
        id: `com_s2_${Date.now()}`,
        username: "Curio AI",
        text: `To prove boundary conditions for ${cappedTopic}, scholars evaluate critical thresholds to establish asymptotic stability margins. It prevents system breakdowns or cascading feedback failures!`,
        likes: 38,
        timestamp: "Just now",
        isAiResponse: true
      }
    ]
  };
}

/**
 * High-quality procedural dialog handler mimicking Socratic coaching
 */
export function generateClientSideCoachComment(card: LearningCard, userQuestion: string): {
  userComment: Comment;
  aiComment: Comment;
} {
  const cleanQ = userQuestion.trim();
  const normQ = cleanQ.toLowerCase();
  
  const userComment: Comment = {
    id: `user_${Date.now()}`,
    username: "CuriousScholar",
    text: cleanQ,
    likes: 0,
    timestamp: "Just now"
  };

  let answerText = "";

  if (normQ.includes("analogy") || normQ.includes("like")) {
    // Analogical explanation
    if (card.subject === "Space & Physics") {
      answerText = `Think of spacetime warping near massive bodies like placing a heavy bowling ball on a tensioned trampoline. Swirling marbles are drawn to it because of the rubber stretching. Clocks behave similarly; the tension slows down their ticking rhythm relative to flat zones outside.`;
    } else if (card.subject === "Biology & Chemistry") {
      answerText = `Imagine a library with millions of master blueprint scrolls. The chloroplast or gene-complex operates like a high-speed copying desk. If a segment of DNA is damaged, CRISPR acts like an automated scan-and-replace document command that replaces single bad words without corrupting the rest of the physical catalogs.`;
    } else if (card.subject === "Math & Computer Science") {
      answerText = `Think of logarithmic search ratios like cutting a long piece of thread. Rather than checking millimeter-by-millimeter from one side, folding the thread in half cuts the search complexity in half at each fold. You arrive at the target fiber almost single-handedly.`;
    } else {
      answerText = `Think of this mechanism like a balanced set of clockwork gears. To coordinate the total system, individual wheels lock into key teeth. Displacing one changes historical trajectories continuously and predictably.`;
    }
  } 
  else if (normQ.includes("fail") || normQ.includes("limit") || normQ.includes("scale") || normQ.includes("boundary")) {
    // Failure limits
    if (card.subject === "Space & Physics") {
      answerText = `At extreme boundaries, classical GR fails. Near singularity coordinates, general relativity produces values tending towards mathematical infinity, denoting that spacetime geometry fractures. Quantum gravity models are required to bridge this scale gap.`;
    } else if (card.subject === "Biology & Chemistry") {
      answerText = `These molecular machines face physical boundaries. DNA tools or enzymes can trace off-target mutations if the guide RNA encounters highly repeating base patterns elsewhere, leading to structural transcript failures or cellular immune defenses.`;
    } else if (card.subject === "Math & Computer Science") {
      answerText = `This process fails if resources or constraints scale exponentially in relation to input sizes. For algorithm setups, caching limits, hardware memory registers, or quantum noise coefficients restrict performance, transforming theoretical math into physical bottlenecks.`;
    } else {
      answerText = `Failure occurs when localized stress factors override systemic recovery. If resources dry up, the system fractures under pressure, leading to systemic structural collapse.`;
    }
  }
  else if (normQ.includes("counter") || normQ.includes("disagree") || normQ.includes("debate") || normQ.includes("alternative")) {
    // Alternative theories
    if (card.subject === "Space & Physics") {
      answerText = `Historically, alternative spacetime models (like modified Newtonian dynamics or string theory dimensions) attempt to resolve cosmic gravity anomalies without dark variables, keeping mathematical debates highly active in quantum classrooms.`;
    } else if (card.subject === "Biology & Chemistry") {
      answerText = `Some biochemists argue that over-reliance on reductionist genetic alterations neglects macro epigenetic environmental impacts. These dynamic environmental changes determine transcription rates more heavily than single gene sequences alone.`;
    } else if (card.subject === "Math & Computer Science") {
      answerText = `While asymptotic O-notation represents standard upper-bound models, practical systems occasionally prefer alternative algorithms with slightly worse theoretical scaling but vastly superior constant execution metrics for small, localized databases.`;
    } else {
      answerText = `Scholars suggest an alternative perspective: structural changes are driven by decentralized patterns rather than a single top-down event, highlighting systemic nuances.`;
    }
  }
  else {
    // Tailored customized Socratic answer
    answerText = `To unpack your query regarding "${card.title}", we examine the fundamental structures of ${card.subject}. It reveals that each variable is critical. How do you propose we balance these structural parameters dynamically to stabilize the system?`;
  }

  const aiComment: Comment = {
    id: `ai_${Date.now()}`,
    username: "Curio AI",
    text: answerText,
    likes: 5,
    timestamp: "Just now",
    isAiResponse: true
  };

  return { userComment, aiComment };
}
