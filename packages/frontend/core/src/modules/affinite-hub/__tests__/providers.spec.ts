import { describe, expect, test } from 'vitest';
import * as Y from 'yjs';

import {
  extractBoardDatedItems,
  extractCalendarDatedItems,
  extractHabitDatedItems,
  extractStreakDatedItems,
} from '../index';
import {
  AFFINITE_YMAP_BOARD,
  AFFINITE_YMAP_CALENDAR,
  AFFINITE_YMAP_HABITS,
  AFFINITE_YMAP_STREAKS,
} from '../keys';
import { readHabitsFromDoc } from '../providers/habits-provider';

describe('extractHabitDatedItems', () => {
  test('maneja documento null, undefined o mapa vacío sin error', () => {
    expect(extractHabitDatedItems(null, '2026-11-02')).toEqual([]);
    expect(extractHabitDatedItems(undefined, '2026-11-02')).toEqual([]);

    const doc = new Y.Doc();
    expect(extractHabitDatedItems(doc, '2026-11-02')).toEqual([]);
  });

  test('maneja JSON corrupto o no-array devolviendo arreglo vacío', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);
    map.set('habits', '{ corrupt: true }');
    expect(extractHabitDatedItems(doc, '2026-11-02')).toEqual([]);

    map.set('habits', 'not-a-json');
    expect(extractHabitDatedItems(doc, '2026-11-02')).toEqual([]);
  });

  test('extrae hábitos proyectados a DatedItem con normalización y done según la fecha', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);

    const habits = [
      {
        id: 'h-water',
        title: 'Beber 2L de agua',
        icon: '💧',
        category: 'salud',
        type: 'quantitative',
        targetValue: 2000,
        unit: 'ml',
        entries: {
          '2026-11-02': 2000,
          '2026-11-03': 0,
        },
      },
      {
        id: 'habit-workout',
        title: 'Entrenamiento funcional',
        category: 'gym', // alias para Fitness
        type: 'boolean',
        color: '#f97316',
        entries: {
          '2026-11-02': false,
        },
      },
      {
        id: 'habit-reading',
        title: 'Lectura diaria',
        icon: '📚',
        category: 'estudio',
        type: 'boolean',
        entries: {
          '2026-11-02': true,
        },
      },
    ];

    map.set('habits', JSON.stringify(habits));

    const items = extractHabitDatedItems(doc, '2026-11-02');
    expect(items).toHaveLength(3);

    // Hábito con icono y cuantitativo completo (evita doble prefijo habit-)
    expect(items[0]).toEqual({
      id: 'habit-water-2026-11-02',
      source: 'habit',
      title: '💧 Beber 2L de agua',
      start: '2026-11-02',
      allDay: true,
      category: 'Salud',
      color: '#10b981', // CATEGORY_COLORS['Salud']
      done: true,
      href: '/habits',
      metadata: {
        habitId: 'habit-water',
        type: 'quantitative',
        targetValue: 2000,
        unit: 'ml',
      },
    });

    // Hábito sin icono, alias de categoría, color personalizado y done: false
    expect(items[1]).toEqual({
      id: 'habit-workout-2026-11-02',
      source: 'habit',
      title: 'Entrenamiento funcional',
      start: '2026-11-02',
      allDay: true,
      category: 'Fitness',
      color: '#f97316',
      done: false,
      href: '/habits',
      metadata: {
        habitId: 'habit-workout',
        type: 'boolean',
        targetValue: undefined,
        unit: undefined,
      },
    });

    // Hábito con done booleano true
    expect(items[2].done).toBe(true);
    expect(items[2].title).toBe('📚 Lectura diaria');
    expect(items[2].category).toBe('Estudio');

    // Comprobar para otra fecha donde entries es 0 / inexistente
    const nextDayItems = extractHabitDatedItems(doc, '2026-11-03');
    expect(nextDayItems[0].done).toBe(false);
    expect(nextDayItems[2].done).toBe(false);
  });

  test('evalúa done: false para hábitos cuantitativos con progreso parcial y done: true al alcanzar targetValue', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);

    const habits = [
      {
        id: 'habit-steps',
        title: 'Caminar 10k pasos',
        type: 'quantitative',
        targetValue: 10000,
        entries: {
          '2026-11-01': 2500, // Progreso parcial (< 10000)
          '2026-11-02': 10000, // Exacto (>= 10000)
          '2026-11-03': 12000, // Superado (>= 10000)
        },
      },
    ];

    map.set('habits', JSON.stringify(habits));

    // Progreso parcial: done debe ser false
    const partial = extractHabitDatedItems(doc, '2026-11-01');
    expect(partial[0].done).toBe(false);

    // Meta alcanzada: done debe ser true
    const exact = extractHabitDatedItems(doc, '2026-11-02');
    expect(exact[0].done).toBe(true);

    // Meta superada: done debe ser true
    const exceeded = extractHabitDatedItems(doc, '2026-11-03');
    expect(exceeded[0].done).toBe(true);
  });

  test('extrae hábitos cuando están almacenados como array directo en Y.Map', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);
    map.set('habits', [
      {
        id: 'meditate',
        title: 'Meditación',
        category: 'mindfulness',
        entries: { '2026-11-02': true },
      },
    ]);

    const items = extractHabitDatedItems(doc, '2026-11-02');
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe('Mente');
    expect(items[0].done).toBe(true);
    expect(items[0].id).toBe('habit-meditate-2026-11-02');
  });

  test('acepta tanto Y.Doc directo como envoltorios { yDoc: doc } y { doc }', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);
    map.set('habits', [
      {
        id: 'h-water',
        title: 'Beber 2L de agua',
        category: 'salud',
        entries: { '2026-11-02': true },
      },
    ]);

    const direct = extractHabitDatedItems(doc, '2026-11-02');
    const withYDoc = extractHabitDatedItems({ yDoc: doc }, '2026-11-02');
    const withDoc = extractHabitDatedItems({ doc }, '2026-11-02');

    expect(direct).toHaveLength(1);
    expect(withYDoc).toEqual(direct);
    expect(withDoc).toEqual(direct);
  });

  test('soporta reminderTime y reminderMinutes en hábitos convirtiendo allDay a false y formateando start', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);

    const habits = [
      {
        id: 'habit-morning-meditation',
        title: 'Meditación matutina',
        category: 'mente',
        reminderTime: '08:45',
        reminderMinutes: 15,
        entries: { '2026-11-02': false },
      },
      {
        id: 'habit-workout',
        title: 'Entrenamiento',
        category: 'fitness',
        // Sin reminderTime ni reminderMinutes
        entries: { '2026-11-02': false },
      },
      {
        id: 'habit-empty-reminder',
        title: 'Lectura',
        category: 'estudio',
        reminderTime: '   ',
        entries: { '2026-11-02': false },
      },
    ];

    map.set('habits', JSON.stringify(habits));

    const items = extractHabitDatedItems(doc, '2026-11-02');
    expect(items).toHaveLength(3);

    // Hábito con recordatorio
    expect(items[0].start).toBe('2026-11-02 08:45');
    expect(items[0].allDay).toBe(false);
    expect(items[0].metadata?.reminderTime).toBe('08:45');
    expect(items[0].metadata?.reminderMinutes).toBe(15);

    // Hábito sin reminderTime
    expect(items[1].start).toBe('2026-11-02');
    expect(items[1].allDay).toBe(true);
    expect(items[1].metadata?.reminderTime).toBeUndefined();
    expect(items[1].metadata?.reminderMinutes).toBeUndefined();

    // Hábito con reminderTime en blanco/vacío
    expect(items[2].start).toBe('2026-11-02');
    expect(items[2].allDay).toBe(true);
  });

  test('filtra hábitos según schedule: L-M-V solo en lunes, miércoles y viernes; weekly-count omitido; daily normal', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);

    const habits = [
      {
        id: 'habit-daily',
        title: 'Hábito diario',
        schedule: { mode: 'daily' },
      },
      {
        id: 'habit-mwf',
        title: 'Gimnasio L-M-V',
        schedule: { mode: 'weekdays', days: [1, 3, 5] },
      },
      {
        id: 'habit-weekly',
        title: 'Llamar a familia',
        schedule: { mode: 'weekly-count', timesPerWeek: 2 },
      },
    ];

    map.set('habits', JSON.stringify(habits));

    // 2026-11-02 = Lunes (isoWeekday 1): daily y mwf presentes; weekly omitido
    const mondayItems = extractHabitDatedItems(doc, '2026-11-02');
    expect(mondayItems).toHaveLength(2);
    expect(mondayItems.map(i => i.metadata?.habitId)).toEqual(['habit-daily', 'habit-mwf']);
    expect(mondayItems[1].metadata?.schedule).toEqual({ mode: 'weekdays', days: [1, 3, 5] });

    // 2026-11-03 = Martes (isoWeekday 2): solo daily presente; mwf y weekly omitidos
    const tuesdayItems = extractHabitDatedItems(doc, '2026-11-03');
    expect(tuesdayItems).toHaveLength(1);
    expect(tuesdayItems[0].metadata?.habitId).toBe('habit-daily');

    // 2026-11-04 = Miércoles (isoWeekday 3): daily y mwf presentes
    const wednesdayItems = extractHabitDatedItems(doc, '2026-11-04');
    expect(wednesdayItems).toHaveLength(2);
    expect(wednesdayItems.map(i => i.metadata?.habitId)).toEqual(['habit-daily', 'habit-mwf']);

    // 2026-11-05 = Jueves (isoWeekday 4): solo daily presente
    const thursdayItems = extractHabitDatedItems(doc, '2026-11-05');
    expect(thursdayItems).toHaveLength(1);
    expect(thursdayItems[0].metadata?.habitId).toBe('habit-daily');

    // 2026-11-06 = Viernes (isoWeekday 5): daily y mwf presentes
    const fridayItems = extractHabitDatedItems(doc, '2026-11-06');
    expect(fridayItems).toHaveLength(2);
    expect(fridayItems.map(i => i.metadata?.habitId)).toEqual(['habit-daily', 'habit-mwf']);
  });
});

describe('readHabitsFromDoc', () => {
  test('devuelve arreglo vacío ante doc nulo, indefinido o corrupto', () => {
    expect(readHabitsFromDoc(null)).toEqual([]);
    expect(readHabitsFromDoc(undefined)).toEqual([]);
    expect(readHabitsFromDoc({})).toEqual([]);

    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);
    map.set('habits', 'not-valid-json');
    expect(readHabitsFromDoc(doc)).toEqual([]);
  });

  test('lee y parsea hábitos desde string JSON o array nativo', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_HABITS);

    const list = [{ id: 'h1', title: 'Habit 1' }];
    map.set('habits', JSON.stringify(list));
    expect(readHabitsFromDoc(doc)).toEqual(list);

    map.set('habits', list);
    expect(readHabitsFromDoc(doc)).toEqual(list);
  });
});

describe('extractStreakDatedItems', () => {
  test('maneja documento null, undefined o mapa vacío sin error', () => {
    expect(extractStreakDatedItems(null)).toEqual([]);
    expect(extractStreakDatedItems(undefined)).toEqual([]);

    const doc = new Y.Doc();
    expect(extractStreakDatedItems(doc)).toEqual([]);
  });

  test('maneja JSON corrupto devolviendo arreglo vacío', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_STREAKS);
    map.set('streaks', 'not-json');
    expect(extractStreakDatedItems(doc)).toEqual([]);
  });

  test('extrae streaks activos y completados proyectados a DatedItem evitando doble prefijo', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_STREAKS);

    const streaks = [
      {
        id: 'streak-code',
        title: 'Codificación diaria',
        icon: '💻',
        mode: 'days',
        startDateTime: '2026-11-01',
        targetDateTime: '2026-11-30',
        category: 'trabajo',
        color: '#2563eb',
        status: 'running',
      },
      {
        id: 'streak-fasting',
        title: 'Ayuno intermitente',
        mode: 'hours',
        startDateTime: '2026-11-02T20:00:00.000Z',
        targetDateTime: '2026-11-03T12:00:00.000Z',
        category: 'salud',
        status: 'completed',
      },
    ];

    map.set('streaks', JSON.stringify(streaks));

    const items = extractStreakDatedItems(doc);
    expect(items).toHaveLength(2);

    expect(items[0]).toEqual({
      id: 'streak-code',
      source: 'streak',
      title: '💻 Codificación diaria',
      start: '2026-11-01',
      end: '2026-11-30',
      allDay: true, // mode === 'days'
      category: 'Trabajo',
      color: '#2563eb',
      done: false, // status !== 'completed'
      href: '/streaks',
      metadata: expect.objectContaining({
        streakId: 'streak-code',
        mode: 'days',
        status: 'running',
      }),
    });

    expect(items[1]).toEqual({
      id: 'streak-fasting',
      source: 'streak',
      title: 'Ayuno intermitente',
      start: '2026-11-02T20:00:00.000Z',
      end: '2026-11-03T12:00:00.000Z',
      allDay: false, // mode === 'hours'
      category: 'Salud',
      color: '#10b981',
      done: true, // status === 'completed'
      href: '/streaks',
      metadata: expect.objectContaining({
        streakId: 'streak-fasting',
        mode: 'hours',
        status: 'completed',
      }),
    });
  });

  test('acepta tanto Y.Doc directo como envoltorios { yDoc: doc } y { doc }', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_STREAKS);
    map.set(
      'streaks',
      JSON.stringify([
        {
          id: 'streak-code',
          title: 'Codificación diaria',
          mode: 'days',
          startDateTime: '2026-11-01',
          targetDateTime: '2026-11-30',
          category: 'trabajo',
          status: 'running',
        },
      ])
    );

    const direct = extractStreakDatedItems(doc);
    const withYDoc = extractStreakDatedItems({ yDoc: doc });
    const withDoc = extractStreakDatedItems({ doc });

    expect(direct).toHaveLength(1);
    expect(withYDoc).toEqual(direct);
    expect(withDoc).toEqual(direct);
  });
});

describe('extractBoardDatedItems', () => {
  test('maneja documento null, undefined o mapa vacío sin error', () => {
    expect(extractBoardDatedItems(null)).toEqual([]);
    expect(extractBoardDatedItems(undefined)).toEqual([]);

    const doc = new Y.Doc();
    expect(extractBoardDatedItems(doc)).toEqual([]);
  });

  test('acepta tanto Y.Doc directo como envoltorio de documento { yDoc }', () => {
    const doc = new Y.Doc();
    expect(extractBoardDatedItems({ yDoc: doc })).toEqual([]);
  });

  test('extrae solo tarjetas con dueDate y determina done por columna o checklist', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_BOARD);

    const columns = [
      { id: 'col-todo', title: 'Por Hacer' },
      { id: 'col-doing', title: 'En Progreso' },
      { id: 'col-done', title: 'Finalizado' },
    ];

    const cards = [
      {
        id: 'card-1',
        columnId: 'col-todo',
        title: 'Tarjeta sin fecha',
      },
      {
        id: 'card-2',
        columnId: 'col-todo',
        title: 'Entrega de informe',
        dueDate: '2026-11-10',
        category: 'estudio',
        checklist: [
          { text: 'Paso 1', completed: true },
          { text: 'Paso 2', completed: false },
        ],
      },
      {
        id: 'card-3',
        columnId: 'col-done',
        title: 'Revisión técnica',
        dueDate: '2026-11-05T15:00:00',
        labels: ['trabajo'],
      },
      {
        id: 'card-4',
        columnId: 'col-doing',
        title: 'Completada por checklist',
        dueDate: '2026-11-08',
        checklist: [
          { text: 'Paso A', completed: true },
          { text: 'Paso B', completed: true },
        ],
      },
    ];

    map.set('columns', JSON.stringify(columns));
    map.set('cards', JSON.stringify(cards));

    const items = extractBoardDatedItems(doc, 'board-abc');
    // card-1 omitida por falta de dueDate
    expect(items).toHaveLength(3);

    // card-2: allDay: true, done: false, href con boardId
    expect(items[0]).toEqual({
      id: 'board-card-2',
      source: 'board',
      title: 'Entrega de informe',
      start: '2026-11-10',
      end: undefined,
      allDay: true,
      category: 'Estudio',
      color: '#8b5cf6',
      done: false,
      href: '/boards?boardId=board-abc',
      metadata: {
        cardId: 'card-2',
        columnId: 'col-todo',
        boardId: 'board-abc',
      },
    });

    // card-3: allDay: false (tiene T), done: true por columna 'Finalizado', category desde labels[0]
    expect(items[1]).toEqual({
      id: 'board-card-3',
      source: 'board',
      title: 'Revisión técnica',
      start: '2026-11-05T15:00:00',
      end: undefined,
      allDay: false,
      category: 'Trabajo',
      color: '#3b82f6',
      done: true,
      href: '/boards?boardId=board-abc',
      metadata: {
        cardId: 'card-3',
        columnId: 'col-done',
        boardId: 'board-abc',
      },
    });

    // card-4: done: true porque todos los elementos del checklist están completados
    expect(items[2].id).toBe('board-card-4');
    expect(items[2].done).toBe(true);

    // Si boardId se omite y boardDocOrYDoc tiene .id, usa ese .id como boardId
    const wrapperWithId = { id: 'board-doc-999', yDoc: doc };
    const itemsFromDoc = extractBoardDatedItems(wrapperWithId);
    expect(itemsFromDoc[0].href).toBe('/boards?boardId=board-doc-999');
    expect(itemsFromDoc[0].metadata?.boardId).toBe('board-doc-999');

    // Si boardId se omite y no hay .id, href es '/boards'
    const itemsWithoutBoardId = extractBoardDatedItems(doc);
    expect(itemsWithoutBoardId[0].href).toBe('/boards');
    expect(itemsWithoutBoardId[0].metadata?.boardId).toBeUndefined();
  });
});

describe('extractCalendarDatedItems', () => {
  test('maneja documento null, undefined o mapa vacío sin error', () => {
    expect(extractCalendarDatedItems(null)).toEqual([]);
    expect(extractCalendarDatedItems(undefined)).toEqual([]);

    const doc = new Y.Doc();
    expect(extractCalendarDatedItems(doc)).toEqual([]);
  });

  test('ignora tareas sin fecha de inicio (date o start)', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_CALENDAR);
    map.set(
      'tasks',
      JSON.stringify([
        { id: 't-nodate', title: 'Tarea sin fecha' },
        { id: 't-valid', title: 'Tarea válida', date: '2026-11-04' },
      ])
    );
    const items = extractCalendarDatedItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('calendar-t-valid');
  });

  test('extrae tareas nativas del calendario y filtra por dateRange correctamente', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_CALENDAR);

    const tasks = [
      {
        id: 't-past',
        title: 'Evento pasado',
        date: '2026-10-25',
        completed: true,
        category: 'Personal',
      },
      {
        id: 't-current',
        title: 'Reunión de sprint',
        date: '2026-11-03',
        startTime: '10:00',
        endTime: '11:00',
        completed: false,
        category: 'trabajo',
        priority: 'high',
        calendarId: 'cal-work',
      },
      {
        id: 't-multi',
        title: 'Conferencia anual',
        date: '2026-11-05',
        endDate: '2026-11-08',
        isAllDay: true,
        completed: false,
        category: 'estudios',
      },
      {
        id: 't-future',
        title: 'Evento futuro',
        date: '2026-11-20',
        completed: false,
      },
    ];

    map.set('tasks', JSON.stringify(tasks));

    // Sin filtro: retorna todas las válidas
    const allItems = extractCalendarDatedItems(doc);
    expect(allItems).toHaveLength(4);

    // Filtrado por dateRange (2026-11-01 a 2026-11-07)
    const filtered = extractCalendarDatedItems(doc, {
      start: '2026-11-01',
      end: '2026-11-07',
    });

    // Debe incluir t-current (11-03) y t-multi (11-05 al 11-08, solapa con 11-05 a 11-07)
    // Debe excluir t-past (10-25) y t-future (11-20)
    expect(filtered).toHaveLength(2);

    expect(filtered[0]).toEqual({
      id: 'calendar-t-current',
      source: 'calendar',
      title: 'Reunión de sprint',
      start: '2026-11-03T10:00',
      end: '2026-11-03T11:00',
      allDay: false,
      category: 'Trabajo',
      color: '#3b82f6',
      done: false,
      href: '/calendar',
      metadata: {
        taskId: 't-current',
        calendarId: 'cal-work',
        priority: 'high',
      },
    });

    expect(filtered[1]).toEqual({
      id: 'calendar-t-multi',
      source: 'calendar',
      title: 'Conferencia anual',
      start: '2026-11-05',
      end: '2026-11-08',
      allDay: true,
      category: 'Estudio',
      color: '#8b5cf6',
      done: false,
      href: '/calendar',
      metadata: {
        taskId: 't-multi',
        calendarId: undefined,
        priority: undefined,
      },
    });
  });

  test('acepta tanto Y.Doc directo como envoltorios { yDoc: doc } y { doc }', () => {
    const doc = new Y.Doc();
    const map = doc.getMap(AFFINITE_YMAP_CALENDAR);
    map.set(
      'tasks',
      JSON.stringify([
        {
          id: 't-meeting',
          title: 'Reunión de sprint',
          date: '2026-11-03',
          completed: false,
        },
      ])
    );

    const direct = extractCalendarDatedItems(doc);
    const withYDoc = extractCalendarDatedItems({ yDoc: doc });
    const withDoc = extractCalendarDatedItems({ doc });

    expect(direct).toHaveLength(1);
    expect(withYDoc).toEqual(direct);
    expect(withDoc).toEqual(direct);
  });
});
