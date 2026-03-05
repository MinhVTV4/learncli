
export interface DockerImage {
  repository: string;
  tag: string;
  imageId: string;
  created: string;
  size: string;
  isPulled: boolean;
}

export interface DockerContainer {
  containerId: string;
  image: string;
  command: string;
  created: number;
  status: 'Up' | 'Exited';
  statusText: string;
  ports: string;
  names: string;
  isDetached: boolean;
}

export class DockerEngine {
  private images: DockerImage[] = [
    { repository: 'hello-world', tag: 'latest', imageId: 'feb5d9fea6a5', created: '2 months ago', size: '13.3kB', isPulled: false },
    { repository: 'ubuntu', tag: 'latest', imageId: 'ba6acccedd29', created: '2 weeks ago', size: '72.8MB', isPulled: false },
    { repository: 'node', tag: '14', imageId: 'c2c03a296d23', created: '3 days ago', size: '943MB', isPulled: false },
    { repository: 'nginx', tag: 'latest', imageId: '605c77e624dd', created: '5 days ago', size: '133MB', isPulled: false },
    { repository: 'alpine', tag: 'latest', imageId: 'a24bb4013296', created: '1 week ago', size: '5.61MB', isPulled: false },
  ];

  private containers: DockerContainer[] = [];

  async pull(imageName: string): Promise<string> {
    const [repo, tag = 'latest'] = imageName.split(':');
    const image = this.images.find(img => img.repository === repo && img.tag === tag);

    if (!image) {
      throw new Error(`Error response from daemon: pull access denied for ${repo}, repository does not exist or may require 'docker login'`);
    }

    if (image.isPulled) {
      return `Status: Image is up to date for ${repo}:${tag}`;
    }

    // Simulate pulling
    let output = `Using default tag: ${tag}\n`;
    output += `${tag}: Pulling from library/${repo}\n`;
    
    // Simulate layers
    const layers = Array.from({ length: 3 }, () => Math.random().toString(36).substring(7));
    for (const layer of layers) {
      output += `${layer}: Pulling fs layer\n`;
    }
    for (const layer of layers) {
      output += `${layer}: Verifying Checksum\n`;
      output += `${layer}: Download complete\n`;
    }
    
    output += `Digest: sha256:${Math.random().toString(16).substring(2)}\n`;
    output += `Status: Downloaded newer image for ${repo}:${tag}`;
    
    image.isPulled = true;
    return output;
  }

  async run(imageName: string, args: string[], flags: { detached: boolean, name?: string }): Promise<string> {
    const [repo, tag = 'latest'] = imageName.split(':');
    let image = this.images.find(img => img.repository === repo && img.tag === tag);

    let output = "";

    // Auto pull if not exists locally
    if (!image || !image.isPulled) {
      output += `Unable to find image '${imageName}' locally\n`;
      try {
        output += await this.pull(imageName) + "\n";
        image = this.images.find(img => img.repository === repo && img.tag === tag);
      } catch (e: any) {
        throw e;
      }
    }

    if (!image) throw new Error("Image not found after pull attempt");

    const containerId = Math.random().toString(16).substring(2, 14);
    const name = flags.name || `${repo}_${Math.floor(Math.random() * 1000)}`;
    
    const container: DockerContainer = {
      containerId,
      image: `${repo}:${tag}`,
      command: args.length > 0 ? `"${args.join(' ')}"` : this.getDefaultCommand(repo),
      created: Date.now(),
      status: 'Up',
      statusText: 'Up Less than a second',
      ports: this.getDefaultPorts(repo),
      names: name,
      isDetached: flags.detached
    };

    this.containers.push(container);

    if (flags.detached) {
      return output + containerId;
    }

    // If attached, simulate output based on image
    output += this.getContainerOutput(repo);
    
    // For non-service containers (like hello-world), they exit immediately
    if (repo === 'hello-world' || repo === 'ubuntu' || repo === 'alpine') {
      container.status = 'Exited';
      container.statusText = 'Exited (0) Less than a second ago';
    }

    return output;
  }

  listImages(): string {
    const header = "REPOSITORY    TAG       IMAGE ID       CREATED         SIZE";
    const rows = this.images
      .filter(img => img.isPulled)
      .map(img => {
        return `${img.repository.padEnd(14)}${img.tag.padEnd(10)}${img.imageId.padEnd(15)}${img.created.padEnd(16)}${img.size}`;
      });
    return [header, ...rows].join('\n');
  }

  listContainers(all: boolean = false): string {
    const header = "CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS                        PORTS     NAMES";
    const rows = this.containers
      .filter(c => all || c.status === 'Up')
      .map(c => {
        const created = "Less than a second ago"; // Simplified
        return `${c.containerId.padEnd(15)}${c.image.padEnd(15)}${c.command.substring(0, 20).padEnd(25)}${created.padEnd(17)}${c.statusText.padEnd(30)}${c.ports.padEnd(10)}${c.names}`;
      });
    return [header, ...rows].join('\n');
  }

  stop(containerIdOrName: string): string {
    const container = this.containers.find(c => c.containerId.startsWith(containerIdOrName) || c.names === containerIdOrName);
    if (!container) throw new Error(`Error response from daemon: No such container: ${containerIdOrName}`);
    
    if (container.status === 'Exited') return containerIdOrName;

    container.status = 'Exited';
    container.statusText = `Exited (0) Less than a second ago`;
    return containerIdOrName;
  }

  rm(containerIdOrName: string): string {
    const index = this.containers.findIndex(c => c.containerId.startsWith(containerIdOrName) || c.names === containerIdOrName);
    if (index === -1) throw new Error(`Error response from daemon: No such container: ${containerIdOrName}`);
    
    const container = this.containers[index];
    if (container.status === 'Up') throw new Error(`Error response from daemon: You cannot remove a running container ${container.containerId}. Stop the container before attempting removal or force remove`);

    this.containers.splice(index, 1);
    return containerIdOrName;
  }

  rmi(imageIdOrRepo: string): string {
    const image = this.images.find(img => img.imageId.startsWith(imageIdOrRepo) || `${img.repository}:${img.tag}` === imageIdOrRepo || img.repository === imageIdOrRepo);
    
    if (!image) throw new Error(`Error response from daemon: No such image: ${imageIdOrRepo}`);
    if (!image.isPulled) throw new Error(`Error response from daemon: No such image: ${imageIdOrRepo}`);

    image.isPulled = false;
    return `Untagged: ${image.repository}:${image.tag}\nDeleted: sha256:${image.imageId}`;
  }

  private getDefaultCommand(repo: string): string {
    switch (repo) {
      case 'hello-world': return '"/hello"';
      case 'nginx': return '"/docker-entrypoint..."';
      case 'node': return '"docker-entrypoint.s..."';
      case 'ubuntu': return '"/bin/bash"';
      case 'alpine': return '"/bin/sh"';
      default: return '"/bin/sh"';
    }
  }

  private getDefaultPorts(repo: string): string {
    switch (repo) {
      case 'nginx': return '80/tcp';
      case 'node': return '';
      default: return '';
    }
  }

  private getContainerOutput(repo: string): string {
    switch (repo) {
      case 'hello-world':
        return `
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
 3. The Docker daemon created a new container from that image which runs the
    executable that produces the output you are currently reading.
 4. The Docker daemon streamed that output to the Docker client, which sent it
    to your terminal.

To try something more ambitious, you can run an Ubuntu container with:
 $ docker run -it ubuntu bash

Share images, automate workflows, and more with a free Docker ID:
 https://hub.docker.com/

For more examples and ideas, visit:
 https://docs.docker.com/get-started/
`;
      case 'ubuntu':
      case 'alpine':
        return ""; // Interactive shell usually, but here we just exit or stay silent
      default:
        return "";
    }
  }
}

export const docker = new DockerEngine();
