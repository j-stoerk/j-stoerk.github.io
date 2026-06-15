import { LearningCard } from "./types";

export const INITIAL_PRESEED_CARDS: LearningCard[] = [
  {
    id: "preseed_1",
    subject: "Space & Physics",
    title: "Why Time Dilates Near a Black Hole",
    creator: "@astro_einstein",
    hashtags: ["einstein", "physics", "blackhole", "relativity", "curio"],
    backgroundNotation: "dτ = dt * √(1 - 2GM/(r c²))",
    content: "Einstein's General Relativity tells us that gravity isn't just a force, but the warping of spacetime! The stronger the gravity, the more spacetime bends. This warping actually stretches time itself. If you spent 1 hour near Sagittarius A*, decades or even centuries would pass for someone far away on Earth. Gravity literally slows the ticking of cosmic clocks!",
    detailedTheory: "Einstein's Field Equations mathematically establish that stress-energy tensor components bend spacetime geometry. In Schwarzschild geometry, the proper time interval is defined by the metric. As distance approaches the event horizon, coordinate time stretches toward infinity relative to proper time. An observer falling into a black hole experiences time locally at a normal rate, but an observer stationed infinitely far away watches the falling subject freeze visually at the horizon boundary.",
    mediaType: "video_simulation",
    animationType: "orbital",
    quiz: {
      question: "What physical mechanism directly causes coordinate clocks to run slower near a black hole?",
      options: [
        "The absolute friction of dark matter against physical gear wheels",
        "The warping of spacetime geometry due to concentrated mass-energy",
        "Centrifugal repulsion forces near the accretion disk",
        "The loss of electrical potential in the atomic nucleus"
      ],
      correctAnswerIndex: 1,
      explanation: "Mass warps the geometry of spacetime. In regions of high mass density, the metric tensor of space and time is stretched, causing coordinate time to flow dramatically slower."
    },
    likes: 8420,
    bookmarks: 4501,
    shares: 2013,
    comments: [
      { id: "c1_1", username: "gravity_wave", text: "Does this mean gravity is a time machine into the future?", likes: 45, timestamp: "2h ago" },
      { id: "c1_2", username: "Curio AI", text: "In a sense, yes @gravity_wave! If you stay near a strong gravitational field and return, you will have aged far less than people on Earth, effectively skipping forward in time.", likes: 98, timestamp: "1h ago", isAiResponse: true }
    ]
  },
  {
    id: "preseed_2",
    subject: "World History",
    title: "The Tragic Myth of the Library of Alexandria",
    creator: "@history_unveiled",
    hashtags: ["alexandria", "ancient", "history", "library", "myths"],
    backgroundNotation: "LATITUDE 31.2001° N · LONGITUDE 29.9187° E",
    content: "The spectacular Library of Alexandria in Egypt did not burn down in a single catastrophic night! While popular lore blames Julius Caesar in 48 BC for its total destruction, the library actually suffered a long, painful decline over centuries. Funding cuts, secondary fires during city siege, and religious decrees slowly reduced the greatest collection of human knowledge to ruins. It was a centuries-long intellectual decay, not a single dramatic blaze.",
    detailedTheory: "Historical records show that the destruction of the Great Library was a gradual degradation. While Julius Caesar accidentally burned part of the fleet and adjacent dock warehouses in 48 BC, the main museum facility was active for centuries. Major milestones of decline include the siege of Alexandria by Aurelian in 270 AD, the absolute destruction of the daughter library Serapeum following Emperor Theodosius's pagan temple decree in 391 AD, and final degradation during the Arab conquest in 642 AD.",
    mediaType: "infographic",
    animationType: "timeline",
    quiz: {
      question: "Which of the following describes the accurate historical destruction of the Great Library?",
      options: [
        "It was swallowed intact by a massive earthquake in 48 BC",
        "It experienced a gradual, multi-century decline due to fires, neglect, and political shifts",
        "A single massive alien orbital blast vaporized the structures",
        "It was completely relocated to Rome in secret by Augustus Caesar"
      ],
      correctAnswerIndex: 1,
      explanation: "Rather than a single fire, the library's demise was a slow dissolution over centuries, caused by military conflicts, changing religious administrations, and evaporating public funds."
    },
    likes: 6200,
    bookmarks: 3105,
    shares: 1140,
    comments: [
      { id: "c2_1", username: "scroll_keeper", text: "Imagine the lost plays and mathematical formulas we missed out on.", likes: 112, timestamp: "4h ago" },
      { id: "c2_2", username: "Curio AI", text: "It is indeed staggering @scroll_keeper. Hundreds of thousands of papyrus scrolls vanished, including lost works by Sophocles and Aristotle.", likes: 74, timestamp: "3h ago", isAiResponse: true }
    ]
  },
  {
    id: "preseed_3",
    subject: "Biology & Chemistry",
    title: "How Plants Steal Sunbeams: Photosynthesis",
    creator: "@biosphere_pro",
    hashtags: ["plants", "chlorophyll", "chemistry", "sunlight", "science"],
    backgroundNotation: "6 CO₂ + 6 H₂O + PHOTONS ➔ C₆H₁₂O₆ + 6 O₂",
    content: "Inside every green leaf, a masterpiece of quantum hardware takes place! Chloroplasts absorb photon packets of sunlight. This energy splits stable water molecules (H2O), freeing oxygen as waste and trapping the high-energy electrons. These electrons are shuffled down a chain to fuel the assembly of glucose from carbon dioxide. Plants literally construct their massive wood and leaves out of thin air, water, and pure sunlight!",
    detailedTheory: "Photosynthesis operates via light-dependent and light-independent pathways. Within the thylakoid membrane, Photosystem II absorbs a photon, exciting an electron that is replaced by enzymatically splitting water. This releases molecular oxygen and protons. Traveling down electron transport chains, the generated NADPH and ATP then power the Calvin Cycle, wherein the enzyme RuBisCO fixes carbon dioxide from the air directly into organic carbon compounds.",
    mediaType: "video_simulation",
    animationType: "reaction",
    quiz: {
      question: "Which molecule is split to harvest electrons and protons, releasing oxygen as a byproduct?",
      options: [
        "Carbon Dioxide (CO2)",
        "Water (H2O)",
        "Glucose (C6H12O6)",
        "Adenosine Triphosphate (ATP)"
      ],
      correctAnswerIndex: 1,
      explanation: "Water photolysis occurs in Photosystem II. Photons excite reaction-center chlorophylls, which tear electrons from water molecules, releasing hydrogen ions and oxygen gas."
    },
    likes: 5800,
    bookmarks: 4501,
    shares: 2013,
    comments: [
      { id: "c3_1", username: "oak_tree_huge", text: "So when wood burns, it's basically releasing stored ancient sunlight?", likes: 281, timestamp: "13h ago" },
      { id: "c3_2", username: "Curio AI", text: "Spot on @oak_tree_huge! Burning wood releases that captured solar energy as heat and light, turning the solid carbon back into gas. It's the cycle of life in reverse!", likes: 198, timestamp: "12h ago", isAiResponse: true }
    ]
  },
  {
    id: "preseed_4",
    subject: "Math & Computer Science",
    title: "What makes Binary Search so blazingly fast?",
    creator: "@code_ninja",
    hashtags: ["coding", "algorithms", "computerscience", "binarysearch", "math"],
    backgroundNotation: "T(N) = T(N/2) + O(1) ➔ O(LOG N)",
    content: "Imagine searching for a name in a physical phonebook of 1 million entries. If you checked page-by-page, it would take up to 1 million steps. But with Binary Search, you open it right in the middle. Is your name earlier or later? You throw away half the book! Open the remaining half in the middle, repeat. Each step halves the remaining candidates. In just 20 cuts, you've pinpointed exactly 1 entry among 1,000,000. That's logarithm complexity O(log n) as a superpower!",
    detailedTheory: "Binary Search operates by computing a middle index mid = low + ⌊(high-low)/2⌋ and comparisons in a sorted array to halve the search space at each stage. This recurrent relationship defines a maximum of O(log n) operations. For 2³⁰ items, it resolves in at most 30 lookup stages, while linear searches would average 536 million iterations, making sorted indices highly performant for database lookups.",
    mediaType: "video_simulation",
    animationType: "timeline",
    quiz: {
      question: "What is the mathematical condition required for an array before you can run a Binary Search?",
      options: [
        "The elements must be completely unique with zero duplicates",
        "The elements must be sorted in an ascending or descending order",
        "The size of the array must be an even power of two",
        "The array must consist purely of binary integer structures"
      ],
      correctAnswerIndex: 1,
      explanation: "Binary search depends on cut decisions (greater-than / less-than) to discard half the database. This division is only valid if elements are arranged in sorted sequence."
    },
    likes: 8900,
    bookmarks: 5800,
    shares: 2400,
    comments: [
      { id: "c4_1", username: "debugger_dan", text: "O(log n) is the closest thing to magic in computer science. Period.", likes: 412, timestamp: "1d ago" },
      { id: "c4_2", username: "math_majesty", text: "I love how this scales. For 1 billion items, it only takes 30 steps!", likes: 320, timestamp: "20h ago" }
    ]
  },
  {
    id: "preseed_5",
    subject: "Space & Physics",
    title: "Quantum Wave Particle Duality",
    creator: "@quant_mechanic",
    hashtags: ["quantum", "physics", "light", "waves", "schrodinger"],
    backgroundNotation: "λ = h / p · iħ ∂Ψ/∂t = ĤΨ",
    content: "If you look closely enough at reality, particles are not solid blocks, and waves are not just ripples! Wave-particle duality shows us that everything—from a beam of light to an electron inside your body—acts as both a wave of probabilities and a discrete packet of energy. When we choose to measure its path, we force the probability wave to collapse into a single physical location, showing how observation defines our physical reality.",
    detailedTheory: "In mechanics, de Broglie's relation calculates a particle's wavelength as lambda equals Planck's constant divided by momentum. The dual nature is described by Schrödinger's Wave Equation, where wavefunctions represent amplitude probabilities. In the classic Double Slit Experiment, single particles passed through slits produce interference structures when left unobserved, but act purely as ballistic particles when a detector is placed in front of the slits, destroying coherent superposition.",
    mediaType: "video_simulation",
    animationType: "reaction",
    quiz: {
      question: "What destroys the wave-like interference pattern of electrons in a double-slit experiment?",
      options: [
        "Increasing the humidity inside the laboratory chamber",
        "Using a magnetic field to accelerate the electron flow",
        "Introducing an observer or detector device to split of the path",
        "Replacing the double-slit frame with a thicker material"
      ],
      correctAnswerIndex: 2,
      explanation: "The act of observing or detecting which slit the electron goes through collapses its wave function, transitioning it into particle-like ballistic trajectories!"
    },
    likes: 5410,
    bookmarks: 3120,
    shares: 981,
    comments: [
      { id: "c5_1", username: "bohr_atomic", text: "Complementarity at its absolute finest.", likes: 110, timestamp: "12h ago" },
      { id: "c5_2", username: "matter_waves", text: "The universe is literally made of probabilities.", likes: 74, timestamp: "9h ago" },
      { id: "c5_3", username: "Curio AI", text: "Indeed @matter_waves! Superposition persists until a measurement breaks down the mathematical wavefunction.", likes: 30, timestamp: "8h ago", isAiResponse: true }
    ]
  },
  {
    id: "preseed_6",
    subject: "Biology & Chemistry",
    title: "CRISPR-Cas9 Molecular Scissors",
    creator: "@gene_architect",
    hashtags: ["crispr", "dna", "genetics", "biotech", "chemistry"],
    backgroundNotation: "gRNA + CAS9 PROTEIN ➔ DSB EDIT SYSTEM",
    content: "Imagine a search-and-replace command, but for the actual scroll of DNA inside a living cell! CRISPR is a revolutionized biotech breakthrough turned molecular software. It pairs a customizable guide RNA with a protein enzyme named Cas9. The guide RNA steers Cas9 to a highly specific address in the 3-billion-letter genome, where it snips the double helix, allowing scientists to disable bad genes or insert healthy genes with pixel perfection.",
    detailedTheory: "The Clustered Regularly Interspaced Short Palindromic Repeats immulogic pathway was discovered in bacteria fighting off phage viruses. The Cas9 endonuclease forms an active complex with guide RNA, scanning genomic sequences for a Protospacer Adjacent Motif. Once bound, Cas9 creates double-strand breaks. The cellular response repairs this breach via non-homologous end-joining which inserts mutations, or homology-directed repair which incorporates healthy donor DNA templates.",
    mediaType: "video_simulation",
    animationType: "dna_helix",
    quiz: {
      question: "How does the Cas9 enzyme find the exact address on the DNA to cut?",
      options: [
        "It uses a heat-seeking magnetic current in the nucleus",
        "It is directed by a synthetic guide RNA matching the target code",
        "It follows a chemical sugar trail left by damaged cells",
        "It systematically checks all 3 billion letters starting from page one"
      ],
      correctAnswerIndex: 1,
      explanation: "Cas9 is bound to a guide RNA (gRNA). The gRNA has a sequence designed to match the targeted address perfectly, steering the enzyme precisely where it must cut!"
    },
    likes: 7120,
    bookmarks: 4053,
    shares: 1621,
    comments: [
      { id: "c6_1", username: "double_helix", text: "This is literally editing the source code of biological life.", likes: 212, timestamp: "1d ago" },
      { id: "c6_2", username: "bio_ethic", text: "An incredibly powerful tool. With great power comes immense responsibility.", likes: 95, timestamp: "18h ago" }
    ]
  },
  {
    id: "preseed_7",
    subject: "Math & Computer Science",
    title: "Public-Key Cryptography and RSA",
    creator: "@crypto_crypt",
    hashtags: ["security", "math", "cryptography", "primes", "modular"],
    backgroundNotation: "C = M^E MOD N · D = E^-1 MOD φ(N)",
    content: "How do you send a private lock and key to someone over the public internet when everyone is listening? You use asymmetric cryptography! Instead of sharing one key, you generate a Public Key (anyone can lock messages with it) and a Private Key (only you can unlock them). The secret math rests on prime factorization: multiplication is incredibly simple, but finding the original primes of a huge number takes computers billions of years!",
    detailedTheory: "The RSA algorithm uses two distinct large prime factors, P and Q, to compute a modulus N = P * Q. The totient is computed as (P-1)*(Q-1). An public exponent E is chosen relative prime to the totient. The private key D is the modular multiplicative inverse. Encryption maps a message M to ciphertext C. Decryption resolves it. Reversing this without knowing P and Q requires solving the extremely hard prime factoring problem.",
    mediaType: "video_simulation",
    animationType: "geometry",
    quiz: {
      question: "Why is RSA asymmetric cryptography secure against standard computers?",
      options: [
        "Supercomputers do not have enough electricity to process simple modulo division",
        "Factoring the product of two massive prime numbers is computationally infeasible",
        "The cryptographic keys are constantly modified every nanosecond of transmission",
        "It wraps the public code inside complex analog radio waves"
      ],
      correctAnswerIndex: 1,
      explanation: "Multiplying two primes is simple, but factoring their product back into P and Q is an extremely hard mathematical problem that would take modern systems thousands of years!"
    },
    likes: 8320,
    bookmarks: 5210,
    shares: 1395,
    comments: [
      { id: "c7_1", username: "primetime", text: "Pure number theory keeping my credit card information secure. Majestic.", likes: 312, timestamp: "2d ago" },
      { id: "c7_2", username: "cyber_sentinel", text: "Once quantum computers arrive with Shor's algorithm, this math changes completely...", likes: 189, timestamp: "1d ago" }
    ]
  },
  {
    id: "preseed_8",
    subject: "World History",
    title: "The Antikythera Analog Computer",
    creator: "@ancient_gears",
    hashtags: ["greece", "tech", "antikythera", "archaeology", "astronomy"],
    backgroundNotation: "METONIC GEARS 235 LUNAR MOTIONS · 19 YEARS",
    content: "In 1901, divers exploring an ancient shipwreck off a Greek island pulled up a green, corroded lump of bronze. It turned out to be the Antikythera Mechanism, a 2,000-year-old analog computer! Composed of over 30 intricate bronze gears, it accurately tracked the cycles of the sun, the phases of the moon, and calculated future planetary eclipses. Modern engineers were shocked; technology of this complexity did not reappear in our civilization for over 1,500 years!",
    detailedTheory: "The Antikythera Mechanism dates back to circa 150-100 BC. It utilized a differential gear system to calculate the Metonic dial—a 19-year calendar cycle containing 235 lunar months—and a Saros dial representing eclipse predictions. It even shifted gear velocity using an eccentric shaft pin-and-slot mechanism to mimic Kepler's second law of planetary orbits before ellipses were mathematically formalised, outputting coordinates mechanically.",
    mediaType: "infographic",
    animationType: "timeline",
    quiz: {
      question: "What functional astronomical cycles did the Antikythera Mechanism mechanically predict?",
      options: [
        "The exact trajectory of nearby stellar meteor collisions",
        "Solar/lunar cycles, eclipse dates, and prime panhellenic game years",
        "The magnetic shifts of the Mediterranean trade winds",
        "The expansion diameter of our Milky Way gravity fields"
      ],
      correctAnswerIndex: 1,
      explanation: "The mechanical calculations tracked solar and lunar positions, Metonic calendars, the Saros cycle for solar/lunar eclipses, and dates of ancient games like the Olympics!"
    },
    likes: 9540,
    bookmarks: 4980,
    shares: 1845,
    comments: [
      { id: "c8_1", username: "archaeo_tech", text: "This is physical proof that technological progress is not always linear.", likes: 450, timestamp: "2d ago" },
      { id: "c8_2", username: "mechanist", text: "Pin-and-slot gear systems to model orbital velocity changes... standard of brilliant engineering!", likes: 382, timestamp: "1d ago" }
    ]
  }
];
