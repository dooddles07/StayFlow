import { Router } from 'express'
import { authRouter } from './auth.routes.js'
import { residentRouter } from './resident.routes.js'
import { staffRouter } from './staff.routes.js'
import { facilityRouter } from './facility.routes.js'
import { bookingRouter } from './booking.routes.js'
import { restaurantRouter } from './restaurant.routes.js'
import { tableRouter } from './table.routes.js'
import { diningReservationRouter } from './diningReservation.routes.js'
import { guestRouter } from './guest.routes.js'
import { eventRouter } from './event.routes.js'
import { noticeRouter } from './notice.routes.js'
import { notificationRouter } from './notification.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/residents', residentRouter)
apiRouter.use('/staff', staffRouter)
apiRouter.use('/facilities', facilityRouter)
apiRouter.use('/bookings', bookingRouter)
apiRouter.use('/restaurants', restaurantRouter)
apiRouter.use('/tables', tableRouter)
apiRouter.use('/dining-reservations', diningReservationRouter)
apiRouter.use('/guests', guestRouter)
apiRouter.use('/events', eventRouter)
apiRouter.use('/notices', noticeRouter)
apiRouter.use('/notifications', notificationRouter)
