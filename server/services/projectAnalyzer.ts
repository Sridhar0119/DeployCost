import AdmZip from 'adm-zip';
import * as yaml from 'js-yaml';
import { Specs } from './awsPricing';

export interface AnalysisResult {
  specs: Specs;
  source: string;
  notes: string[];
  usedFallbackFor: string[];
}

// Helper to parse memory string (e.g. "512m", "1g", "256M", "2G", "1024Mi", "1Gi") to GB
function parseMemoryToGB(memStr: string | number | undefined, defaultGB = 1): number {
  if (memStr === undefined || memStr === null) return defaultGB;
  if (typeof memStr === 'number') {
    // If it's a number, assume bytes and convert to GB
    return Math.max(0.1, parseFloat((memStr / (1024 * 1024 * 1024)).toFixed(2)));
  }

  const clean = memStr.toString().trim().toLowerCase();
  if (!clean) return defaultGB;

  const match = clean.match(/^([0-9.]+)\s*([a-z]*)$/);
  if (!match) return defaultGB;

  const val = parseFloat(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'g':
    case 'gb':
    case 'gi':
      return val;
    case 'm':
    case 'mb':
    case 'mi':
      return parseFloat((val / 1024).toFixed(3));
    case 'k':
    case 'kb':
    case 'ki':
      return parseFloat((val / (1024 * 1024)).toFixed(3));
    default:
      // No unit, assume bytes
      return parseFloat((val / (1024 * 1024 * 1024)).toFixed(3));
  }
}

// Helper to parse CPU string (e.g., "100m" -> 0.1, "1.5" -> 1.5) to numeric CPUs
function parseCPU(cpuStr: string | number | undefined, defaultCPU = 1): number {
  if (cpuStr === undefined || cpuStr === null) return defaultCPU;
  if (typeof cpuStr === 'number') return cpuStr;

  const clean = cpuStr.toString().trim().toLowerCase();
  if (!clean) return defaultCPU;

  if (clean.endsWith('m')) {
    // Kubernetes millicores, e.g., "500m" -> 0.5 CPU
    const val = parseFloat(clean.slice(0, -1));
    return parseFloat((val / 1000).toFixed(3));
  }

  const parsed = parseFloat(clean);
  return isNaN(parsed) ? defaultCPU : parsed;
}

/**
 * Parses docker-compose.yml content and aggregates specs
 */
export function analyzeDockerCompose(content: string): AnalysisResult {
  const notes: string[] = [];
  const usedFallbackFor: string[] = [];
  let totalCpu = 0;
  let totalRam = 0;
  let serviceCount = 0;

  try {
    const doc = yaml.load(content) as any;
    if (doc && doc.services) {
      const services = doc.services;
      for (const serviceName of Object.keys(services)) {
        serviceCount++;
        const svc = services[serviceName];
        let svcCpu = 0;
        let svcRam = 0;

        // Try reading v3 limits: deploy.resources.limits
        const limits = svc.deploy?.resources?.limits;
        if (limits) {
          if (limits.cpus) {
            svcCpu = parseCPU(limits.cpus, 0);
          }
          if (limits.memory) {
            svcRam = parseMemoryToGB(limits.memory, 0);
          }
        }

        // Try reading v2 limits: cpus, mem_limit
        if (svcCpu === 0 && svc.cpus) {
          svcCpu = parseCPU(svc.cpus, 0);
        }
        if (svcRam === 0 && svc.mem_limit) {
          svcRam = parseMemoryToGB(svc.mem_limit, 0);
        }

        // Apply fallback if still 0
        if (svcCpu === 0) {
          svcCpu = 0.5; // Default 0.5 CPU per service
          usedFallbackFor.push(`service:${serviceName}:cpu`);
        }
        if (svcRam === 0) {
          svcRam = 1.0; // Default 1GB RAM per service
          usedFallbackFor.push(`service:${serviceName}:ram`);
        }

        totalCpu += svcCpu;
        totalRam += svcRam;
      }
      notes.push(`Detected docker-compose.yml with ${serviceCount} services.`);
    } else {
      throw new Error('No services key found in docker-compose.yml');
    }
  } catch (err: any) {
    notes.push(`Failed to parse docker-compose.yml: ${err.message}. Using default specs.`);
    totalCpu = 2;
    totalRam = 4;
    usedFallbackFor.push('docker-compose-parsing');
  }

  // Bound results
  const cpu = Math.max(1, Math.min(64, Math.ceil(totalCpu)));
  const ram = Math.max(1, Math.min(128, Math.ceil(totalRam)));
  const storage = Math.max(10, serviceCount * 15);
  const bandwidth = Math.max(10, serviceCount * 10);

  return {
    specs: { cpu, ram, storage, bandwidth },
    source: 'docker-compose.yml',
    notes,
    usedFallbackFor,
  };
}

/**
 * Parses Kubernetes manifests (supporting multi-document manifests)
 */
export function analyzeKubernetes(content: string): AnalysisResult {
  const notes: string[] = [];
  const usedFallbackFor: string[] = [];
  let totalCpu = 0;
  let totalRam = 0;
  let podCount = 0;

  try {
    // k8s files can have multiple documents split by '---'
    const docs = yaml.loadAll(content) as any[];
    
    for (const doc of docs) {
      if (!doc || !doc.kind) continue;

      // Find containers inside standard pod templates
      let containers: any[] = [];
      if (doc.kind === 'Pod' && doc.spec?.containers) {
        containers = doc.spec.containers;
        podCount++;
      } else if (
        ['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet', 'Job'].includes(doc.kind) &&
        doc.spec?.template?.spec?.containers
      ) {
        containers = doc.spec.template.spec.containers;
        const replicas = doc.spec.replicas || 1;
        podCount += replicas;
        
        // Multiply container resources by replicas
        containers = containers.map((c) => ({
          ...c,
          replicas,
        }));
      }

      for (const container of containers) {
        const reps = container.replicas || 1;
        let cCpu = 0;
        let cRam = 0;

        const resources = container.resources;
        // Prefer limits, then requests
        if (resources) {
          if (resources.limits?.cpu) {
            cCpu = parseCPU(resources.limits.cpu, 0);
          } else if (resources.requests?.cpu) {
            cCpu = parseCPU(resources.requests.cpu, 0);
          }

          if (resources.limits?.memory) {
            cRam = parseMemoryToGB(resources.limits.memory, 0);
          } else if (resources.requests?.memory) {
            cRam = parseMemoryToGB(resources.requests.memory, 0);
          }
        }

        if (cCpu === 0) {
          cCpu = 0.5;
          usedFallbackFor.push(`pod:${container.name || 'unnamed'}:cpu`);
        }
        if (cRam === 0) {
          cRam = 1.0;
          usedFallbackFor.push(`pod:${container.name || 'unnamed'}:ram`);
        }

        totalCpu += (cCpu * reps);
        totalRam += (cRam * reps);
      }
    }

    notes.push(`Detected Kubernetes manifest with estimated ${podCount} pods.`);
  } catch (err: any) {
    notes.push(`Failed to parse Kubernetes manifest: ${err.message}. Using fallback.`);
    totalCpu = 2;
    totalRam = 4;
    usedFallbackFor.push('k8s-parsing');
  }

  const cpu = Math.max(1, Math.min(64, Math.ceil(totalCpu)));
  const ram = Math.max(1, Math.min(128, Math.ceil(totalRam)));
  const storage = Math.max(10, Math.ceil(podCount * 12));
  const bandwidth = Math.max(10, Math.ceil(podCount * 8));

  return {
    specs: { cpu, ram, storage, bandwidth },
    source: 'Kubernetes Manifest',
    notes,
    usedFallbackFor,
  };
}

/**
 * Parses Dockerfile and determines resource specs
 */
export function analyzeDockerfile(content: string): AnalysisResult {
  const notes: string[] = [];
  const usedFallbackFor: string[] = [];
  
  // Defaults
  let cpu = 1;
  let ram = 2;
  let storage = 15;
  let bandwidth = 15;

  const lines = content.split('\n');
  let baseImage = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('FROM ')) {
      baseImage = trimmed.slice(5).trim().split(' ')[0].split(':')[0];
      break;
    }
  }

  if (baseImage) {
    notes.push(`Found base Docker image: "${baseImage}".`);
    const img = baseImage.toLowerCase();
    
    if (img.includes('openjdk') || img.includes('java') || img.includes('maven') || img.includes('gradle')) {
      notes.push('Java environment detected. Suggesting high RAM requirements.');
      cpu = 2;
      ram = 4;
      storage = 25;
    } else if (img.includes('node') || img.includes('bun') || img.includes('npm')) {
      notes.push('Node.js environment detected. Standard container specs applied.');
      cpu = 1;
      ram = 2;
      storage = 15;
    } else if (img.includes('python') || img.includes('django') || img.includes('conda')) {
      notes.push('Python environment detected. Standard container specs applied.');
      cpu = 1;
      ram = 2;
      storage = 15;
    } else if (img.includes('golang') || img.includes('rust') || img.includes('alpine') || img.includes('distroless')) {
      notes.push('Lightweight Go, Rust or Alpine compiler base image detected.');
      cpu = 1;
      ram = 1;
      storage = 10;
    } else {
      usedFallbackFor.push('unrecognized-docker-base');
    }
  } else {
    notes.push('No base image found in Dockerfile. Using default single-service specs.');
    usedFallbackFor.push('dockerfile-from-instruction');
  }

  return {
    specs: { cpu, ram, storage, bandwidth },
    source: 'Dockerfile',
    notes,
    usedFallbackFor,
  };
}

/**
 * Scans a ZIP archive for configuration files or applies language file heuristics
 */
export function analyzeZip(buffer: Buffer): AnalysisResult {
  const notes: string[] = [];
  const usedFallbackFor: string[] = [];

  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    // 1. Search for docker-compose.yml
    const composeEntry = entries.find((e) => {
      const name = e.entryName.toLowerCase();
      return name === 'docker-compose.yml' || name === 'docker-compose.yaml' || name.endsWith('/docker-compose.yml') || name.endsWith('/docker-compose.yaml');
    });

    if (composeEntry) {
      notes.push(`Found docker-compose file inside ZIP: "${composeEntry.entryName}". Parsing...`);
      const res = analyzeDockerCompose(composeEntry.getData().toString('utf8'));
      res.notes = [...notes, ...res.notes];
      res.source = `ZIP (${composeEntry.entryName})`;
      return res;
    }

    // 2. Search for Kubernetes manifest
    const k8sEntry = entries.find((e) => {
      const name = e.entryName.toLowerCase();
      return (name.endsWith('.yaml') || name.endsWith('.yml')) && (name.includes('k8s') || name.includes('deployment') || name.includes('manifest'));
    });

    if (k8sEntry) {
      notes.push(`Found Kubernetes manifest inside ZIP: "${k8sEntry.entryName}". Parsing...`);
      const res = analyzeKubernetes(k8sEntry.getData().toString('utf8'));
      res.notes = [...notes, ...res.notes];
      res.source = `ZIP (${k8sEntry.entryName})`;
      return res;
    }

    // 3. Search for Dockerfile
    const dockerfileEntry = entries.find((e) => {
      const name = e.entryName.toLowerCase();
      return name === 'dockerfile' || name.endsWith('/dockerfile');
    });

    if (dockerfileEntry) {
      notes.push(`Found Dockerfile inside ZIP: "${dockerfileEntry.entryName}". Parsing...`);
      const res = analyzeDockerfile(dockerfileEntry.getData().toString('utf8'));
      res.notes = [...notes, ...res.notes];
      res.source = `ZIP (${dockerfileEntry.entryName})`;
      return res;
    }

    // 4. Fall back to language-based heuristics by scanning file extensions
    notes.push('No explicit deployment config files found. Analyzing file extensions...');
    
    let extCounts: Record<string, number> = {};
    let packageJsonContent = '';
    let hasRequirementsTxt = false;
    let hasPomXml = false;
    let hasGoMod = false;
    let hasCargoToml = false;
    let totalUncompressedSize = 0;

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      
      totalUncompressedSize += entry.header.size;
      const name = entry.entryName.toLowerCase();
      
      if (name.endsWith('package.json')) {
        packageJsonContent = entry.getData().toString('utf8');
      } else if (name.endsWith('requirements.txt')) {
        hasRequirementsTxt = true;
      } else if (name.endsWith('pom.xml') || name.endsWith('build.gradle')) {
        hasPomXml = true;
      } else if (name.endsWith('go.mod')) {
        hasGoMod = true;
      } else if (name.endsWith('cargo.toml')) {
        hasCargoToml = true;
      }

      const dotIdx = entry.name.lastIndexOf('.');
      if (dotIdx !== -1) {
        const ext = entry.name.slice(dotIdx + 1).toLowerCase();
        extCounts[ext] = (extCounts[ext] || 0) + 1;
      }
    }

    // Deduce specs based on project characteristics
    let cpu = 1;
    let ram = 2;
    let storage = 20;
    let bandwidth = 20;
    let detectedLanguage = 'Generic Web App';

    if (hasPomXml || extCounts['java'] > 0) {
      detectedLanguage = 'Java / JVM';
      cpu = 2;
      ram = 4;
      storage = 40;
      bandwidth = 30;
      notes.push('Detected JVM project files (Java/Kotlin). Suggesting 2 CPU and 4GB RAM.');
    } else if (packageJsonContent || extCounts['js'] > 0 || extCounts['ts'] > 0 || extCounts['jsx'] > 0 || extCounts['tsx'] > 0) {
      detectedLanguage = 'Node.js / JavaScript';
      cpu = 1;
      ram = 2;
      storage = 20;
      bandwidth = 20;
      
      let depsCount = 0;
      try {
        const pkg = JSON.parse(packageJsonContent);
        const deps = Object.keys(pkg.dependencies || {}).length;
        const devDeps = Object.keys(pkg.devDependencies || {}).length;
        depsCount = deps + devDeps;
        notes.push(`Parsed package.json with ${depsCount} dependencies.`);
        if (depsCount > 35) {
          notes.push('Large dependency trees can expand Node process footprint. Incrementing RAM allocation.');
          ram = 3;
        }
      } catch {
        // failed parsing package.json
      }
    } else if (hasRequirementsTxt || extCounts['py'] > 0) {
      detectedLanguage = 'Python';
      cpu = 1;
      ram = 2;
      storage = 25;
      bandwidth = 20;
      notes.push('Detected Python environment. Recommending 1 CPU and 2GB RAM.');
    } else if (hasGoMod || extCounts['go'] > 0) {
      detectedLanguage = 'Go';
      cpu = 1;
      ram = 1;
      storage = 15;
      bandwidth = 15;
      notes.push('Detected Go project structure. Lightweight execution profile configured (1 CPU, 1GB RAM).');
    } else if (hasCargoToml || extCounts['rs'] > 0) {
      detectedLanguage = 'Rust';
      cpu = 1;
      ram = 1;
      storage = 15;
      bandwidth = 15;
      notes.push('Detected Rust environment. Highly optimized runtime defaults suggested.');
    } else {
      usedFallbackFor.push('language-heuristics');
    }

    // Size-based storage increments
    const sizeMB = totalUncompressedSize / (1024 * 1024);
    notes.push(`Total uncompressed codebase size: ${sizeMB.toFixed(2)} MB.`);
    if (sizeMB > 100) {
      notes.push('Large codebase size detected. Raising storage recommendations.');
      storage += 30;
    } else if (sizeMB > 25) {
      storage += 15;
    }

    return {
      specs: { cpu, ram, storage, bandwidth },
      source: `ZIP heuristics (${detectedLanguage})`,
      notes,
      usedFallbackFor,
    };

  } catch (err: any) {
    notes.push(`ZIP analysis failed: ${err.message}. Using default single-service specs.`);
    usedFallbackFor.push('zip-parsing');
    return {
      specs: { cpu: 2, ram: 4, storage: 50, bandwidth: 20 },
      source: 'ZIP File (Fallback)',
      notes,
      usedFallbackFor,
    };
  }
}

/**
 * Main project file analysis router
 */
export function analyzeProjectFile(filename: string, fileBuffer: Buffer): AnalysisResult {
  const lower = filename.toLowerCase();
  
  if (lower.endsWith('.zip')) {
    return analyzeZip(fileBuffer);
  } else if (lower === 'docker-compose.yml' || lower === 'docker-compose.yaml' || lower.endsWith('/docker-compose.yml')) {
    return analyzeDockerCompose(fileBuffer.toString('utf8'));
  } else if (lower === 'dockerfile' || lower.endsWith('/dockerfile')) {
    return analyzeDockerfile(fileBuffer.toString('utf8'));
  } else if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    // Check if it's Kubernetes
    const text = fileBuffer.toString('utf8');
    if (text.includes('apiVersion:') && text.includes('kind:')) {
      return analyzeKubernetes(text);
    }
    // General YAML fallback - treat as docker-compose if has services, or k8s if it works
    if (text.includes('services:')) {
      return analyzeDockerCompose(text);
    }
  }

  // Generic fallback for unrecognized file types
  return {
    specs: { cpu: 1, ram: 2, storage: 20, bandwidth: 15 },
    source: filename,
    notes: [`Unrecognized format for "${filename}". Applied standard general server templates.`],
    usedFallbackFor: ['file-format-detection'],
  };
}
