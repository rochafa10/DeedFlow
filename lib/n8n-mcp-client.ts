/**
 * n8n-MCP Client for Tax Deed Platform
 * Provides integration with n8n-MCP server for workflow management
 */

import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  disabled?: boolean;
  continueOnFail?: boolean;
}

export interface WorkflowConnection {
  main: Array<Array<{
    node: string;
    type: string;
    index: number;
  }>>;
}

export interface Workflow {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, WorkflowConnection>;
  settings?: Record<string, any>;
  staticData?: Record<string, any> | null;
  active?: boolean;
}

export interface WorkflowListResponse {
  data: Workflow[];
  nextCursor?: string;
}

export interface ExecutionResponse {
  id: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  data?: any;
  error?: string;
}

export class N8nMCPClient {
  private client: AxiosInstance;
  private n8nClient: AxiosInstance;

  constructor() {
    // n8n-MCP server connection
    const mcpUrl = process.env.N8N_MCP_URL || 'http://localhost:3001';
    const apiKey = process.env.N8N_API_KEY || process.env.NEXT_PUBLIC_N8N_API_KEY || '';

    this.client = axios.create({
      baseURL: mcpUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      timeout: 30000
    });

    // Direct n8n API connection
    const n8nUrl = process.env.N8N_API_URL || 'http://localhost:5678';
    this.n8nClient = axios.create({
      baseURL: `${n8nUrl}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey
      },
      timeout: 30000
    });
  }

  // ===== Workflow Management =====

  /**
   * Create a new workflow
   */
  async createWorkflow(workflow: Workflow): Promise<Workflow> {
    try {
      // Clean workflow data for API
      const cleanWorkflow = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || {},
        staticData: workflow.staticData || null
      };

      const response = await this.n8nClient.post('/workflows', cleanWorkflow);
      return response.data;
    } catch (error: any) {
      console.error('Error creating workflow:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const response = await this.n8nClient.put(`/workflows/${id}`, workflow);
      return response.data;
    } catch (error: any) {
      console.error('Error updating workflow:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await this.n8nClient.get(`/workflows/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error getting workflow:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(): Promise<WorkflowListResponse> {
    try {
      const response = await this.n8nClient.get('/workflows');
      return response.data;
    } catch (error: any) {
      console.error('Error listing workflows:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.n8nClient.delete(`/workflows/${id}`);
    } catch (error: any) {
      console.error('Error deleting workflow:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Activate or deactivate a workflow
   */
  async setWorkflowActive(id: string, active: boolean): Promise<Workflow> {
    try {
      const response = await this.n8nClient.patch(`/workflows/${id}`, { active });
      return response.data;
    } catch (error: any) {
      console.error('Error setting workflow active state:', error.response?.data || error.message);
      throw error;
    }
  }

  // ===== Workflow Execution =====

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(id: string, data?: any): Promise<ExecutionResponse> {
    try {
      const response = await this.n8nClient.post(`/workflows/${id}/execute`, {
        workflowData: data || {}
      });
      return response.data;
    } catch (error: any) {
      console.error('Error executing workflow:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Trigger a webhook workflow
   */
  async triggerWebhook(webhookPath: string, data: any): Promise<any> {
    try {
      const n8nUrl = process.env.N8N_API_URL || 'http://localhost:5678';
      const response = await axios.post(
        `${n8nUrl}/webhook/${webhookPath}`,
        data,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error triggering webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  // ===== Workflow Validation =====

  /**
   * Validate a workflow structure
   */
  async validateWorkflow(workflow: Workflow): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      // Basic validation
      const errors: string[] = [];

      if (!workflow.name) {
        errors.push('Workflow name is required');
      }

      if (!workflow.nodes || workflow.nodes.length === 0) {
        errors.push('Workflow must have at least one node');
      }

      // Validate node structure
      workflow.nodes?.forEach((node, index) => {
        if (!node.id) errors.push(`Node ${index} missing id`);
        if (!node.name) errors.push(`Node ${index} missing name`);
        if (!node.type) errors.push(`Node ${index} missing type`);
        if (!node.position) errors.push(`Node ${index} missing position`);
      });

      // Validate connections (check both node IDs and names)
      Object.entries(workflow.connections || {}).forEach(([sourceKey, connection]) => {
        const sourceExists = workflow.nodes?.some(n => n.id === sourceKey || n.name === sourceKey);
        if (!sourceExists) {
          errors.push(`Connection source '${sourceKey}' not found in nodes`);
        }
      });

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      console.error('Error validating workflow:', error.message);
      throw error;
    }
  }

  // ===== Utility Methods =====

  /**
   * Find workflow by name
   */
  async findWorkflowByName(name: string): Promise<Workflow | null> {
    try {
      const { data } = await this.listWorkflows();
      return data.find(w => w.name === name) || null;
    } catch (error: any) {
      console.error('Error finding workflow by name:', error.message);
      return null;
    }
  }

  /**
   * Create or update workflow
   */
  async upsertWorkflow(workflow: Workflow): Promise<Workflow> {
    try {
      const existing = await this.findWorkflowByName(workflow.name);
      
      if (existing && existing.id) {
        // Update existing workflow
        return await this.updateWorkflow(existing.id, workflow);
      } else {
        // Create new workflow
        return await this.createWorkflow(workflow);
      }
    } catch (error: any) {
      console.error('Error upserting workflow:', error.message);
      throw error;
    }
  }

  /**
   * Import workflow from JSON file
   */
  async importWorkflowFromJson(jsonString: string): Promise<Workflow> {
    try {
      const workflow = JSON.parse(jsonString);
      
      // Validate before import
      const validation = await this.validateWorkflow(workflow);
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors?.join(', ')}`);
      }
      
      return await this.upsertWorkflow(workflow);
    } catch (error: any) {
      console.error('Error importing workflow from JSON:', error.message);
      throw error;
    }
  }

  /**
   * Export workflow to JSON
   */
  async exportWorkflowToJson(id: string): Promise<string> {
    try {
      const workflow = await this.getWorkflow(id);
      return JSON.stringify(workflow, null, 2);
    } catch (error: any) {
      console.error('Error exporting workflow to JSON:', error.message);
      throw error;
    }
  }

  /**
   * Get webhook URL for a workflow
   */
  getWebhookUrl(workflow: Workflow): string | null {
    const webhookNode = workflow.nodes?.find(n => n.type === 'n8n-nodes-base.webhook');
    if (webhookNode) {
      const path = webhookNode.parameters?.path || webhookNode.id;
      const n8nUrl = process.env.N8N_API_URL || 'http://localhost:5678';
      return `${n8nUrl}/webhook/${path}`;
    }
    return null;
  }
}

// Export singleton instance
export const n8nMCP = new N8nMCPClient();