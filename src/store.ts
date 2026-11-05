export interface Task { id: number; title: string; done: boolean }
export interface TaskStore {
  list(): Promise<Task[]>;
  create(title: string): Promise<Task>;
  done(id: number): Promise<Task | null>;
  ready(): Promise<void>;
  close(): Promise<void>;
}

export class MemoryStore implements TaskStore {
  private tasks: Task[] = [];
  async list(): Promise<Task[]> { return this.tasks.map((task) => ({ ...task })); }
  async create(title: string): Promise<Task> {
    const task = { id: this.tasks.length + 1, title, done: false };
    this.tasks.push(task);
    return { ...task };
  }
  async done(id: number): Promise<Task | null> {
    const task = this.tasks.find((item) => item.id === id);
    if (!task) return null;
    task.done = true;
    return { ...task };
  }
  async ready(): Promise<void> { return; }
  async close(): Promise<void> { return; }
}
