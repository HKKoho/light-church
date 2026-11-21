import { Module } from '@nestjs/common';

import { EmbeddingModule } from '../engine/embeddings/embedding.module.js';
import { OneShotLlmModule } from '../engine/one-shot/one-shot-llm.module.js';
import { PdfExtractionService } from '../engine/tools/document-reading/pdf-extraction.service.js';
import { TheologyAssistantService } from './assistant.service.js';
import { TheologyIngestionService } from './ingestion.service.js';
import { TheologySearchService } from './search.service.js';
import { TheologyLibraryController } from './theology-library.controller.js';
import { TheologyLibraryService } from './theology-library.service.js';

@Module({
  imports: [EmbeddingModule, OneShotLlmModule],
  controllers: [TheologyLibraryController],
  providers: [
    TheologyLibraryService,
    TheologyIngestionService,
    TheologySearchService,
    TheologyAssistantService,
    PdfExtractionService,
  ],
})
export class TheologyLibraryModule {}
