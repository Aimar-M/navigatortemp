type MessageHandler = (event: MessageEvent) => void;
type ErrorHandler = (event: Event) => void;
type StatusChangeHandler = (status: 'connecting' | 'connected' | 'disconnected') => void;

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private errorHandler: ErrorHandler | null = null;
  private statusChangeHandler: StatusChangeHandler | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private reconnectTimeout: number | null = null;
  private userId: number | null = null;
  private tripIds: number[] = [];

  connect(userId: number, tripIds: number[]) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }

    this.userId = userId;
    this.tripIds = tripIds;
    this.setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.setConnectionStatus('connected');
      // Send auth message
      this.send('auth', { userId, tripIds });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handlers = this.messageHandlers.get(data.type) || [];
        handlers.forEach(handler => handler(data));
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    this.socket.onerror = (event) => {
      if (this.errorHandler) {
        this.errorHandler(event);
      }
      console.error('WebSocket error:', event);
    };

    this.socket.onclose = () => {
      this.setConnectionStatus('disconnected');
      
      // Attempt to reconnect after a delay
      if (this.reconnectTimeout === null && this.userId) {
        this.reconnectTimeout = window.setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect(this.userId!, this.tripIds);
        }, 3000);
      }
    };
  }

  disconnect() {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.userId = null;
    this.tripIds = [];
    this.setConnectionStatus('disconnected');
  }

  send(type: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    } else {
      console.warn('Attempted to send message while WebSocket is not connected');
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) return;
    
    const handlers = this.messageHandlers.get(type)!;
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  onStatusChange(handler: StatusChangeHandler) {
    this.statusChangeHandler = handler;
  }

  getStatus() {
    return this.connectionStatus;
  }

  updateTripIds(tripIds: number[]) {
    this.tripIds = tripIds;
    if (this.connectionStatus === 'connected' && this.userId) {
      this.send('auth', { userId: this.userId, tripIds });
    }
  }

  private setConnectionStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.connectionStatus = status;
    if (this.statusChangeHandler) {
      this.statusChangeHandler(status);
    }
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();
