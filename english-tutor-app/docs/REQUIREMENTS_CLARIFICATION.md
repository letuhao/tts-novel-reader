# Requirements Clarification Questions

**Date:** 2025-12-21  
**Purpose:** Clarify requirements before implementation

---

## 1. User Authentication & Multi-User Support

### Q1.1: Do we need user authentication for MVP?
- [ ] Yes, required for MVP
- [ ] No, single user for now
- [ ] Maybe, add later

**If Yes:**
- What authentication method? (JWT, OAuth, Email/Password)
- Do we need email verification?
- Do we need password reset?

### Q1.2: Multi-user support?
- [ ] Single user only (for now)
- [ ] Multiple users, separate conversations
- [ ] Multiple users, shared conversations (future)

---

## 2. Memory Management

### Q2.1: Which memory management approach?
- [ ] Use LangChain `ConversationSummaryBufferMemory` (recommended)
- [ ] Custom implementation (sliding window)
- [ ] Custom implementation (full control)
- [ ] Evaluate both, decide later

### Q2.2: Memory strategy preference?
- [ ] Sliding window (simple, fast)
- [ ] Summarization (better for long conversations)
- [ ] Hierarchical (best for very long conversations)
- [ ] Auto-select based on conversation length

### Q2.3: Token limits?
- Default max tokens per conversation context? (e.g., 4000, 8000)
- Should this be configurable per conversation?
- Should this be configurable per user?

---

## 3. Database & Persistence

### Q3.1: Database migration approach?
- [ ] Create all tables at once (full schema)
- [ ] Incremental migrations (one feature at a time)
- [ ] Start with core tables, add others later

### Q3.2: Data retention?
- How long should we keep conversations? (forever, 1 year, 90 days?)
- Should users be able to delete conversations?
- Should we archive old conversations?

### Q3.3: Backup strategy?
- [ ] Manual backup only
- [ ] Automated daily backups
- [ ] Real-time replication
- [ ] Not needed for MVP

---

## 4. Core Features Priority

### Q4.1: Which features are MUST HAVE for MVP?
Rank these (1 = highest priority):
- [ ] Core conversation system (event-driven)
- [ ] Memory management
- [ ] Message persistence
- [ ] Chunk-based TTS
- [ ] Audio playback queue
- [ ] Conversation history
- [ ] User authentication
- [ ] Grammar correction
- [ ] Vocabulary tracking
- [ ] Progress tracking

### Q4.2: Which features can wait for Phase 2?
- [ ] Conversation sharing
- [ ] Bookmarks
- [ ] Folders
- [ ] Notes
- [ ] Message editing/deletion
- [ ] Typing indicators
- [ ] Conversation templates

---

## 5. User Experience

### Q5.1: Conversation interface preferences?
- [ ] Simple chat interface (like ChatGPT)
- [ ] Rich interface with sidebars (conversation list, settings)
- [ ] Full-screen focused mode
- [ ] Customizable layout

### Q5.2: Audio playback behavior?
- [ ] Auto-play when ready (current)
- [ ] User must click to play
- [ ] Configurable per user
- [ ] Configurable per conversation

### Q5.3: Voice input (STT)?
- [ ] Required for MVP
- [ ] Nice to have, add later
- [ ] Not needed

### Q5.4: Visual indicators?
- [ ] Show TTS generation status (pending, processing, ready)
- [ ] Show audio playback status (playing, paused)
- [ ] Show typing indicators
- [ ] Show progress bars
- [ ] Minimal indicators only

---

## 6. Performance & Scalability

### Q6.1: Expected usage?
- How many concurrent users? (1, 10, 100, 1000+)
- How many conversations per user?
- Average messages per conversation?
- Expected peak load?

### Q6.2: Performance requirements?
- Maximum response time for Ollama? (e.g., 5s, 10s, 30s)
- Maximum TTS generation time per chunk? (e.g., 2s, 5s)
- Should we optimize for speed or quality?

### Q6.3: Caching strategy?
- [ ] Cache TTS audio files (how long?)
- [ ] Cache conversation summaries
- [ ] Cache Ollama responses
- [ ] No caching for MVP

---

## 7. Integration & Services

### Q7.1: Ollama configuration?
- Model to use? (gemma3:12b, other?)
- Should model be configurable per conversation?
- Should temperature/other params be configurable?

### Q7.2: TTS service?
- Current Coqui TTS backend - keep as is?
- Should voice be configurable per conversation?
- Should speed be configurable?

### Q7.3: STT service?
- Current Whisper backend - keep as is?
- Required for MVP or later?
- Real-time or batch processing?

---

## 8. Error Handling & Resilience

### Q8.1: Error handling approach?
- [ ] Show errors to user immediately
- [ ] Retry automatically (how many times?)
- [ ] Queue failed requests for retry
- [ ] Log errors, continue silently

### Q8.2: Service failures?
- What if Ollama is down? (show error, queue, retry?)
- What if TTS is down? (fallback to text only?)
- What if database is down? (cache in memory, retry?)

### Q8.3: WebSocket reconnection?
- [ ] Auto-reconnect with exponential backoff
- [ ] Show reconnection status to user
- [ ] Replay missed events on reconnect
- [ ] Manual reconnect only

---

## 9. Testing & Quality

### Q9.1: Testing requirements?
- [ ] Unit tests required
- [ ] Integration tests required
- [ ] E2E tests required
- [ ] Manual testing only for MVP

### Q9.2: Code quality?
- [ ] Strict TypeScript (already enabled)
- [ ] ESLint rules
- [ ] Code reviews
- [ ] Documentation requirements

---

## 10. Deployment & Infrastructure

### Q10.1: Deployment target?
- [ ] Local development only
- [ ] Single server deployment
- [ ] Docker containers
- [ ] Cloud deployment (AWS, GCP, Azure?)
- [ ] Kubernetes (future)

### Q10.2: Environment variables?
- Which services need config? (Ollama URL, TTS URL, DB connection, etc.)
- Should we use .env files?
- Should we use system settings from database?

---

## 11. Security & Privacy

### Q11.1: Data privacy?
- [ ] Conversations are private (user can only see their own)
- [ ] Conversations can be shared (with permission)
- [ ] Admin can view all conversations
- [ ] GDPR compliance needed?

### Q11.2: Data encryption?
- [ ] Encrypt conversations at rest?
- [ ] Encrypt in transit (HTTPS/WSS)?
- [ ] No encryption for MVP

---

## 12. Monitoring & Logging

### Q12.1: Logging requirements?
- [ ] Current Pino logging sufficient?
- [ ] Need structured logging for production?
- [ ] Need log aggregation (ELK, Datadog, etc.)?

### Q12.2: Monitoring?
- [ ] Application metrics (response times, errors)
- [ ] Database metrics
- [ ] Service health checks
- [ ] User analytics
- [ ] Not needed for MVP

---

## 13. Development Workflow

### Q13.1: Development approach?
- [ ] Build all features at once
- [ ] Incremental (one feature at a time)
- [ ] Feature branches
- [ ] Trunk-based development

### Q13.2: Documentation?
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture diagrams
- [ ] User guides
- [ ] Developer guides
- [ ] Minimal docs for MVP

---

## 14. Timeline & Scope

### Q14.1: MVP timeline?
- Target date for MVP? (e.g., 2 weeks, 1 month, 3 months)
- What's the minimum viable feature set?

### Q14.2: Phase 2 timeline?
- When should we start Phase 2?
- What's the priority order for Phase 2 features?

---

## 15. Open Questions

### Q15.1: Any specific requirements not covered?
- User-specific requirements?
- Business requirements?
- Technical constraints?
- Integration requirements?

### Q15.2: Success criteria?
- How do we know MVP is successful?
- What metrics matter?
- What's the definition of "done"?

---

## Quick Decision Matrix

**For each question, please provide:**
1. Your answer/choice
2. Priority (Must Have / Should Have / Nice to Have)
3. Any additional notes or constraints

---

## Next Steps

After answering these questions, we will:
1. Create a prioritized implementation plan
2. Update design documents with decisions
3. Create detailed technical specifications
4. Start implementation with clear requirements

