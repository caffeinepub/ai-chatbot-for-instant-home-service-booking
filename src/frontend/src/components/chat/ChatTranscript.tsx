import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../chat/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface ChatTranscriptProps {
  messages: ChatMessage[];
}

export default function ChatTranscript({ messages }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollRef}>
      <div className="space-y-4 py-4 max-w-3xl mx-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : message.role === 'system' ? 'justify-center' : 'justify-start'} animate-fade-in`}
          >
            <div className={message.role === 'user' ? 'chat-bubble-user' : message.role === 'bot' ? 'chat-bubble-bot' : 'chat-bubble-system'}>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {format(message.timestamp, 'h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
