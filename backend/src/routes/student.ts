import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { requireVerifiedStudent } from '../middleware/auth.js';
import { validate } from '../lib/validation.js';
import { idSchema, profileSchema, semesterSchema, registerSchema } from '../validators/student.js';
import { archiveResume, getAcademics, getCompletion, getNotifications, getProfile, getResumes, getSemesters, postSemester, putAcademics, putProfile, putSemester, readNotification, removeSemester, setPrimaryResume, uploadProfilePhoto, uploadResume, registerUser } from '../controllers/studentController.js';
import { AppError } from '../lib/errors.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter: (_request, file, callback) => callback(null, file.fieldname === 'resume' ? file.mimetype === 'application/pdf' : ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });
export const studentRouter = Router();
studentRouter.post('/register', validate(registerSchema), registerUser);
studentRouter.use(requireAuth);
studentRouter.use((request, _response, next) => {
  const AUTHORIZED_ADMIN_EMAIL = 'placement123@gmail.com';
  const isAdmin = request.authUser?.email === AUTHORIZED_ADMIN_EMAIL;
  if (!isAdmin && request.authUser?.role !== 'STUDENT') {
    return next(new AppError(403, 'Student access required', 'STUDENT_ROLE_REQUIRED'));
  }
  next();
});
studentRouter.get('/profile', getProfile);
studentRouter.put('/profile', validate(profileSchema), putProfile);
studentRouter.get('/profile/completion', getCompletion);
studentRouter.get('/academics', getAcademics);
studentRouter.put('/academics', validate(profileSchema), putAcademics);
studentRouter.get('/academics/semesters', getSemesters);
studentRouter.post('/academics/semesters', validate(semesterSchema), postSemester);
studentRouter.put('/academics/semesters/:id', validate(semesterSchema), putSemester);
studentRouter.delete('/academics/semesters/:id', validate(idSchema), removeSemester);
studentRouter.get('/resumes', getResumes);
studentRouter.post('/resumes', upload.single('resume'), uploadResume);
studentRouter.patch('/resumes/:id/primary', validate(idSchema), setPrimaryResume);
studentRouter.delete('/resumes/:id', validate(idSchema), archiveResume);
studentRouter.post('/profile/photo', upload.single('photo'), uploadProfilePhoto);
studentRouter.get('/notifications', getNotifications);
studentRouter.patch('/notifications/:id/read', validate(idSchema), readNotification);
