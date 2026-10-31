import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateCourseRequest {
  description: string;
  zone: string;
  scheduledAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = '/api/courses';

  constructor(private http: HttpClient) {}

  createCourse(data: CreateCourseRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getMyCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-courses`);
  }

  // Récupère la liste des courses publiées
  getPublishedCourses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/published`);
  }

  // Créer une offre pour une course
  createOffer(courseId: number, amount: number, details: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${courseId}/offers`, { amount, details });
  }

  updateCourse(id: number, data: CreateCourseRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getCourseById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getMyMissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-missions`);
  }
}
