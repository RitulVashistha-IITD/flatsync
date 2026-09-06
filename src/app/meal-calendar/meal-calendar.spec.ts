import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MealCalendar } from './meal-calendar';

describe('MealCalendar', () => {
  let component: MealCalendar;
  let fixture: ComponentFixture<MealCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(MealCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
