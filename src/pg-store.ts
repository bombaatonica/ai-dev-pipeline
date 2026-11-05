import pg from 'pg';
import type { Task, TaskStore } from './store.js';

export class PgStore implements TaskStore {
  private pool: pg.Pool;
  constructor(connectionString: string) { this.pool = new pg.Pool({ connectionString }); }
  async migrate(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS tasks (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
      done boolean NOT NULL DEFAULT false
    )`);
  }
  async list(): Promise<Task[]> {
    const result = await this.pool.query<Task>('SELECT id, title, done FROM tasks ORDER BY id');
    return result.rows;
  }
  async create(title: string): Promise<Task> {
    const result = await this.pool.query<Task>('INSERT INTO tasks(title) VALUES ($1) RETURNING id, title, done', [title]);
    return result.rows[0];
  }
  async done(id: number): Promise<Task | null> {
    const result = await this.pool.query<Task>('UPDATE tasks SET done = true WHERE id = $1 RETURNING id, title, done', [id]);
    return result.rows[0] ?? null;
  }
  async ready(): Promise<void> { await this.pool.query('SELECT 1'); }
  async close(): Promise<void> { await this.pool.end(); }
}
