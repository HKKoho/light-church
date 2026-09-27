import { Module } from '@nestjs/common';

import { VenueRentalController } from './venue-rental.controller.js';
import { VenueRentalService } from './venue-rental.service.js';

@Module({
  controllers: [VenueRentalController],
  providers: [VenueRentalService],
})
export class VenueRentalModule {}
