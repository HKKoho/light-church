import { Module } from '@nestjs/common';

import { ConnectorsModule } from '../connectors/connectors.module.js';
import { VenueRentalController } from './venue-rental.controller.js';
import { VenueRentalService } from './venue-rental.service.js';

@Module({
  imports: [ConnectorsModule],
  controllers: [VenueRentalController],
  providers: [VenueRentalService],
})
export class VenueRentalModule {}
