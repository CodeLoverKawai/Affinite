/**
 * Habit Icon & Color Catalog Engine
 * Pure functional catalog and utilities with zero React or UI dependencies.
 */

export interface HabitIconItem {
  emoji: string;
  label: string;
  group: string;
  keywords: string[];
}

export interface HabitIconGroup {
  id: string;
  name: string;
  icon: string;
  icons: HabitIconItem[];
}

export interface HabitColorPalette {
  id: string;
  name: string;
  colors: string[];
}

export const HABIT_ICON_GROUPS: HabitIconGroup[] = [
  {
    id: 'salud',
    name: 'Salud',
    icon: '🩺',
    icons: [
      { emoji: '💧', label: 'Agua', group: 'salud', keywords: ['agua', 'water', 'hidratacion', 'hydration', 'beber', 'drink'] },
      { emoji: '💊', label: 'Medicina', group: 'salud', keywords: ['medicina', 'medicine', 'pastillas', 'pills', 'vitaminas', 'vitamins', 'salud'] },
      { emoji: '🩺', label: 'Chequeo médico', group: 'salud', keywords: ['chequeo', 'medico', 'doctor', 'salud', 'health', 'estetoscopio'] },
      { emoji: '🩹', label: 'Primeros auxilios', group: 'salud', keywords: ['primeros auxilios', 'curita', 'bandage', 'salud', 'herida'] },
      { emoji: '🦷', label: 'Dientes', group: 'salud', keywords: ['dientes', 'teeth', 'dental', 'cepillado', 'brush', 'sonrisa'] },
      { emoji: '👁️', label: 'Vista', group: 'salud', keywords: ['vista', 'ojos', 'eyes', 'optometria', 'vision', 'descanso visual'] },
      { emoji: '🌡️', label: 'Temperatura', group: 'salud', keywords: ['temperatura', 'termometro', 'fiebre', 'fever', 'salud'] },
      { emoji: '🩸', label: 'Sangre', group: 'salud', keywords: ['sangre', 'blood', 'donar', 'analisis', 'glucosa'] },
      { emoji: '🧴', label: 'Cuidado de la piel', group: 'salud', keywords: ['piel', 'skin', 'skincare', 'crema', 'bloqueador'] },
      { emoji: '🪥', label: 'Cepillo de dientes', group: 'salud', keywords: ['cepillo', 'toothbrush', 'limpieza', 'higiene', 'dental'] },
      { emoji: '🧼', label: 'Lavado de manos', group: 'salud', keywords: ['jabon', 'soap', 'lavado', 'manos', 'higiene', 'limpieza'] },
      { emoji: '🛌', label: 'Dormir bien', group: 'salud', keywords: ['dormir', 'sleep', 'cama', 'descanso', 'sueno', 'rest'] },
      { emoji: '🧠', label: 'Salud mental', group: 'salud', keywords: ['cerebro', 'brain', 'salud mental', 'mental health', 'neurologia'] },
      { emoji: '🫁', label: 'Respiración pulmonar', group: 'salud', keywords: ['pulmones', 'lungs', 'respiracion', 'breath', 'oxigeno'] },
      { emoji: '☀️', label: 'Vitamina D', group: 'salud', keywords: ['sol', 'sun', 'vitamina d', 'manana', 'luz'] },
    ],
  },
  {
    id: 'fitness-deporte',
    name: 'Fitness y Deporte',
    icon: '🏋️',
    icons: [
      { emoji: '🏃', label: 'Correr', group: 'fitness-deporte', keywords: ['correr', 'run', 'running', 'cardio', 'trote', 'jogging'] },
      { emoji: '🏋️', label: 'Pesas', group: 'fitness-deporte', keywords: ['pesas', 'weights', 'gimnasio', 'gym', 'fuerza', 'strength'] },
      { emoji: '🚴', label: 'Ciclismo', group: 'fitness-deporte', keywords: ['ciclismo', 'cycling', 'bici', 'bicicleta', 'bike'] },
      { emoji: '🏊', label: 'Natación', group: 'fitness-deporte', keywords: ['natacion', 'swimming', 'nadar', 'piscina', 'pool'] },
      { emoji: '🚶', label: 'Caminar', group: 'fitness-deporte', keywords: ['caminar', 'walk', 'walking', 'pasos', 'steps'] },
      { emoji: '🤸', label: 'Estiramiento', group: 'fitness-deporte', keywords: ['estiramiento', 'stretching', 'flexibilidad', 'calistenia', 'gimnasia'] },
      { emoji: '🧗', label: 'Escalada', group: 'fitness-deporte', keywords: ['escalada', 'climbing', 'boulder', 'montana', 'roca'] },
      { emoji: '🥊', label: 'Boxeo', group: 'fitness-deporte', keywords: ['boxeo', 'boxing', 'guantes', 'sparring', 'combate'] },
      { emoji: '⚽', label: 'Fútbol', group: 'fitness-deporte', keywords: ['futbol', 'soccer', 'football', 'pelota', 'partido'] },
      { emoji: '🏀', label: 'Baloncesto', group: 'fitness-deporte', keywords: ['baloncesto', 'basketball', 'canasta', 'basket'] },
      { emoji: '🎾', label: 'Tenis', group: 'fitness-deporte', keywords: ['tenis', 'tennis', 'raqueta', 'court'] },
      { emoji: '🛹', label: 'Patineta', group: 'fitness-deporte', keywords: ['patineta', 'skate', 'skateboard', 'patinar'] },
      { emoji: '🚣', label: 'Remo', group: 'fitness-deporte', keywords: ['remo', 'rowing', 'remar', 'cardio'] },
      { emoji: '🤾', label: 'Balonmano', group: 'fitness-deporte', keywords: ['balonmano', 'handball', 'deporte', 'equipo'] },
      { emoji: '🎽', label: 'Entrenamiento', group: 'fitness-deporte', keywords: ['entrenamiento', 'workout', 'ejercicio', 'fitness', 'maraton'] },
    ],
  },
  {
    id: 'mente-bienestar',
    name: 'Mente y Bienestar',
    icon: '🧘',
    icons: [
      { emoji: '🧘', label: 'Meditación', group: 'mente-bienestar', keywords: ['meditacion', 'meditation', 'zen', 'yoga', 'mindfulness', 'paz'] },
      { emoji: '🕯️', label: 'Calma y velas', group: 'mente-bienestar', keywords: ['vela', 'candle', 'calma', 'relajacion', 'aroma'] },
      { emoji: '🌸', label: 'Flor de cerezo', group: 'mente-bienestar', keywords: ['cerezo', 'flor', 'calma', 'belleza', 'serenidad'] },
      { emoji: '🕊️', label: 'Paz interior', group: 'mente-bienestar', keywords: ['paz', 'paloma', 'peace', 'armonia', 'tranquilidad'] },
      { emoji: '🪷', label: 'Florecer espiritual', group: 'mente-bienestar', keywords: ['loto', 'lotus', 'espiritual', 'mindfulness', 'armonia'] },
      { emoji: '🍵', label: 'Té relajante', group: 'mente-bienestar', keywords: ['te', 'tea', 'infusion', 'calma', 'relajacion'] },
      { emoji: '🌬️', label: 'Respiración guiada', group: 'mente-bienestar', keywords: ['respiracion', 'viento', 'pranayama', 'aire', 'breathe'] },
      { emoji: '🌅', label: 'Amanecer consciente', group: 'mente-bienestar', keywords: ['amanecer', 'sunrise', 'madrugar', 'manana', 'gratitud'] },
      { emoji: '🌌', label: 'Noche estrellada', group: 'mente-bienestar', keywords: ['estrellas', 'cielo', 'observacion', 'contemplacion', 'universo'] },
      { emoji: '💆', label: 'Masaje y autocuidado', group: 'mente-bienestar', keywords: ['masaje', 'massage', 'autocuidado', 'self care', 'spa'] },
      { emoji: '🛁', label: 'Baño relajante', group: 'mente-bienestar', keywords: ['bano', 'bath', 'tina', 'descanso', 'relax'] },
      { emoji: '🫂', label: 'Abrazos y empatía', group: 'mente-bienestar', keywords: ['abrazo', 'hug', 'empatia', 'afecto', 'cuidado'] },
      { emoji: '🎋', label: 'Bambú y equilibrio', group: 'mente-bienestar', keywords: ['bambu', 'bamboo', 'balance', 'equilibrio', 'resiliencia'] },
      { emoji: '📿', label: 'Rosario y mantra', group: 'mente-bienestar', keywords: ['mantra', 'oracion', 'prayer', 'cuentas', 'fe'] },
      { emoji: '☯️', label: 'Balance y Yin Yang', group: 'mente-bienestar', keywords: ['yin yang', 'balance', 'equilibrio', 'dualidad', 'filosofia'] },
    ],
  },
  {
    id: 'estudio-lectura',
    name: 'Estudio y Lectura',
    icon: '📚',
    icons: [
      { emoji: '📚', label: 'Libros', group: 'estudio-lectura', keywords: ['libros', 'books', 'leer', 'reading', 'estudio', 'biblioteca'] },
      { emoji: '📖', label: 'Lectura diaria', group: 'estudio-lectura', keywords: ['lectura', 'libro abierto', 'reading', 'capitulo', 'novela'] },
      { emoji: '🎓', label: 'Graduación y academia', group: 'estudio-lectura', keywords: ['graduacion', 'universidad', 'carrera', 'diploma', 'estudio'] },
      { emoji: '✏️', label: 'Lápiz y escritura', group: 'estudio-lectura', keywords: ['lapiz', 'pencil', 'escribir', 'escritura', 'apuntes', 'notas'] },
      { emoji: '📝', label: 'Tomar notas', group: 'estudio-lectura', keywords: ['notas', 'notes', 'apuntes', 'memo', 'resumen'] },
      { emoji: '📑', label: 'Documentos y papers', group: 'estudio-lectura', keywords: ['documento', 'paper', 'articulo', 'investigacion', 'tesis'] },
      { emoji: '🔖', label: 'Marcapáginas', group: 'estudio-lectura', keywords: ['marcapaginas', 'bookmark', 'pagina', 'marcador'] },
      { emoji: '🔬', label: 'Investigación científica', group: 'estudio-lectura', keywords: ['microscopio', 'ciencia', 'science', 'investigacion', 'lab'] },
      { emoji: '🔭', label: 'Astronomía y exploración', group: 'estudio-lectura', keywords: ['telescopio', 'astronomia', 'estudio', 'espacio'] },
      { emoji: '📐', label: 'Geometría y matemáticas', group: 'estudio-lectura', keywords: ['regla', 'geometria', 'matematicas', 'math', 'precision'] },
      { emoji: '🎒', label: 'Mochila escolar', group: 'estudio-lectura', keywords: ['mochila', 'backpack', 'colegio', 'clases', 'escuela'] },
      { emoji: '📜', label: 'Certificado e historia', group: 'estudio-lectura', keywords: ['pergamino', 'certificado', 'historia', 'filosofia'] },
      { emoji: '🗂️', label: 'Fichas de estudio', group: 'estudio-lectura', keywords: ['fichas', 'flashcards', 'organizacion', 'estudio'] },
      { emoji: '🖋️', label: 'Pluma estilográfica', group: 'estudio-lectura', keywords: ['pluma', 'pen', 'caligrafia', 'escritura'] },
      { emoji: '💡', label: 'Nuevas ideas', group: 'estudio-lectura', keywords: ['idea', 'bombilla', 'insight', 'creatividad', 'aprender'] },
    ],
  },
  {
    id: 'trabajo-codigo',
    name: 'Trabajo y Código',
    icon: '💻',
    icons: [
      { emoji: '💻', label: 'Laptop y programación', group: 'trabajo-codigo', keywords: ['computadora', 'laptop', 'codigo', 'code', 'programar', 'software'] },
      { emoji: '🖥️', label: 'Monitor de escritorio', group: 'trabajo-codigo', keywords: ['monitor', 'desktop', 'pantalla', 'workstation', 'desarrollo'] },
      { emoji: '⌨️', label: 'Mecanografía y teclado', group: 'trabajo-codigo', keywords: ['teclado', 'keyboard', 'typing', 'mecanografia'] },
      { emoji: '🖱️', label: 'Navegación y ratón', group: 'trabajo-codigo', keywords: ['mouse', 'raton', 'click', 'navegar'] },
      { emoji: '🖨️', label: 'Impresión de trabajo', group: 'trabajo-codigo', keywords: ['impresora', 'printer', 'documentos', 'oficina'] },
      { emoji: '📊', label: 'Gráficos y análisis', group: 'trabajo-codigo', keywords: ['graficos', 'charts', 'datos', 'analytics', 'kpi'] },
      { emoji: '📈', label: 'Crecimiento y métricas', group: 'trabajo-codigo', keywords: ['crecimiento', 'metricas', 'productividad', 'rendimiento'] },
      { emoji: '📉', label: 'Control de pérdidas', group: 'trabajo-codigo', keywords: ['grafica descendente', 'analisis', 'riesgos', 'errores'] },
      { emoji: '📁', label: 'Archivos y carpetas', group: 'trabajo-codigo', keywords: ['carpeta', 'folder', 'archivos', 'organizacion'] },
      { emoji: '💼', label: 'Portafolio profesional', group: 'trabajo-codigo', keywords: ['maletin', 'briefcase', 'trabajo', 'negocios', 'reunion'] },
      { emoji: '📅', label: 'Calendario y reuniones', group: 'trabajo-codigo', keywords: ['calendario', 'agenda', 'calendar', 'reuniones', 'fechas'] },
      { emoji: '⏳', label: 'Gestión del tiempo', group: 'trabajo-codigo', keywords: ['reloj de arena', 'tiempo', 'pomodoro', 'plazos', 'deadlines'] },
      { emoji: '✉️', label: 'Correos electrónicos', group: 'trabajo-codigo', keywords: ['email', 'correo', 'inbox', 'mensajes', 'comunicacion'] },
      { emoji: '📌', label: 'Tareas prioritarias', group: 'trabajo-codigo', keywords: ['pin', 'chincheta', 'prioridad', 'importante', 'todo'] },
      { emoji: '🗄️', label: 'Archivo administrativo', group: 'trabajo-codigo', keywords: ['archivador', 'documentos', 'gestion', 'orden'] },
    ],
  },
  {
    id: 'hogar-rutina',
    name: 'Hogar y Rutina',
    icon: '🏠',
    icons: [
      { emoji: '🏠', label: 'Casa y hogar', group: 'hogar-rutina', keywords: ['casa', 'home', 'hogar', 'familia', 'rutina'] },
      { emoji: '🧹', label: 'Barrer y limpiar', group: 'hogar-rutina', keywords: ['escoba', 'broom', 'limpieza', 'barrer', 'orden'] },
      { emoji: '🧺', label: 'Lavandería', group: 'hogar-rutina', keywords: ['lavanderia', 'ropa', 'laundry', 'lavar', 'canasta'] },
      { emoji: '🪟', label: 'Ventilar y ventanas', group: 'hogar-rutina', keywords: ['ventana', 'window', 'ventilar', 'aire fresco', 'limpieza'] },
      { emoji: '🪴', label: 'Cuidar plantas de casa', group: 'hogar-rutina', keywords: ['planta', 'houseplant', 'maceta', 'regar'] },
      { emoji: '🛏️', label: 'Hacer la cama', group: 'hogar-rutina', keywords: ['cama', 'bed', 'ordenar cama', 'manana', 'habito'] },
      { emoji: '🚪', label: 'Salir a tiempo', group: 'hogar-rutina', keywords: ['puerta', 'door', 'puntualidad', 'salir'] },
      { emoji: '🗝️', label: 'Llaves organizadas', group: 'hogar-rutina', keywords: ['llave', 'key', 'seguridad', 'orden'] },
      { emoji: '🛋️', label: 'Espacio ordenado', group: 'hogar-rutina', keywords: ['sofa', 'sala', 'orden', 'descanso'] },
      { emoji: '🧽', label: 'Limpieza profunda', group: 'hogar-rutina', keywords: ['esponja', 'sponge', 'fregar', 'platos', 'cocina'] },
      { emoji: '📦', label: 'Despejar y ordenar', group: 'hogar-rutina', keywords: ['caja', 'box', 'declutter', 'ordenar', 'donar'] },
      { emoji: '🔌', label: 'Desconectar aparatos', group: 'hogar-rutina', keywords: ['enchufe', 'plug', 'ahorro energia', 'electricidad'] },
      { emoji: '🪞', label: 'Arreglarse y espejo', group: 'hogar-rutina', keywords: ['espejo', 'mirror', 'presentacion', 'aseo'] },
      { emoji: '⏰', label: 'Despertador temprano', group: 'hogar-rutina', keywords: ['despertador', 'alarm', 'madrugar', 'hora'] },
      { emoji: '🗑️', label: 'Sacar la basura', group: 'hogar-rutina', keywords: ['basura', 'trash', 'reciclaje', 'limpieza'] },
    ],
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    icon: '💰',
    icons: [
      { emoji: '💰', label: 'Ahorro y dinero', group: 'finanzas', keywords: ['dinero', 'money', 'bolsa', 'ahorro', 'finanzas'] },
      { emoji: '🪙', label: 'Monedas y cambio', group: 'finanzas', keywords: ['moneda', 'coin', 'centavos', 'cambio', 'ahorro'] },
      { emoji: '💵', label: 'Billetes y efectivo', group: 'finanzas', keywords: ['billetes', 'cash', 'efectivo', 'dolares'] },
      { emoji: '💳', label: 'Tarjetas de crédito', group: 'finanzas', keywords: ['tarjeta', 'credit card', 'debito', 'pagos'] },
      { emoji: '🏦', label: 'Banco e inversiones', group: 'finanzas', keywords: ['banco', 'bank', 'deposito', 'intereses'] },
      { emoji: '🧾', label: 'Facturas y recibos', group: 'finanzas', keywords: ['recibo', 'factura', 'receipt', 'gastos', 'cuentas'] },
      { emoji: '🏷️', label: 'Ofertas y presupuestos', group: 'finanzas', keywords: ['etiqueta', 'tag', 'descuento', 'presupuesto', 'compras'] },
      { emoji: '💎', label: 'Inversiones de valor', group: 'finanzas', keywords: ['diamante', 'gem', 'patrimonio', 'inversion'] },
      { emoji: '🏧', label: 'Cajero automático', group: 'finanzas', keywords: ['cajero', 'atm', 'retiro', 'banca'] },
      { emoji: '👛', label: 'Monedero', group: 'finanzas', keywords: ['monedero', 'wallet', 'cartera', 'presupuesto'] },
      { emoji: '💹', label: 'Mercado bursátil', group: 'finanzas', keywords: ['bolsa', 'acciones', 'stock', 'trading', 'mercado'] },
      { emoji: '⚖️', label: 'Balance financiero', group: 'finanzas', keywords: ['balanza', 'balance', 'justicia', 'cuentas claras'] },
      { emoji: '🧮', label: 'Contabilidad y cálculo', group: 'finanzas', keywords: ['abaco', 'calculadora', 'cuentas', 'contabilidad'] },
      { emoji: '🔐', label: 'Seguridad financiera', group: 'finanzas', keywords: ['candado', 'seguridad', 'proteccion', 'fondos'] },
      { emoji: '💱', label: 'Cambio de divisas', group: 'finanzas', keywords: ['divisas', 'exchange', 'moneda extranjera', 'forex'] },
    ],
  },
  {
    id: 'social-familia',
    name: 'Social y Familia',
    icon: '👥',
    icons: [
      { emoji: '👥', label: 'Comunidad y amigos', group: 'social-familia', keywords: ['comunidad', 'amigos', 'friends', 'grupo', 'social'] },
      { emoji: '👨‍👩‍👧‍👦', label: 'Familia unida', group: 'social-familia', keywords: ['familia', 'family', 'padres', 'hijos', 'hogar'] },
      { emoji: '📞', label: 'Llamar a seres queridos', group: 'social-familia', keywords: ['llamada', 'telefono', 'call', 'hablar', 'contacto'] },
      { emoji: '💌', label: 'Cartas y mensajes con cariño', group: 'social-familia', keywords: ['carta', 'amor', 'love letter', 'mensaje', 'agradecimiento'] },
      { emoji: '🎁', label: 'Regalos y detalles', group: 'social-familia', keywords: ['regalo', 'gift', 'presente', 'sorpresa', 'cumpleanos'] },
      { emoji: '🤝', label: 'Saludos y acuerdos', group: 'social-familia', keywords: ['apreton', 'handshake', 'acuerdo', 'amistad', 'respeto'] },
      { emoji: '🗣️', label: 'Conversación y escucha', group: 'social-familia', keywords: ['conversacion', 'hablar', 'escuchar', 'dialogo'] },
      { emoji: '🎈', label: 'Fiestas y celebraciones', group: 'social-familia', keywords: ['globo', 'balloon', 'fiesta', 'celebracion'] },
      { emoji: '🎉', label: 'Festejos compartidos', group: 'social-familia', keywords: ['confeti', 'party', 'evento', 'logro'] },
      { emoji: '👶', label: 'Cuidado de bebés', group: 'social-familia', keywords: ['bebe', 'baby', 'maternidad', 'paternidad', 'crianza'] },
      { emoji: '👴', label: 'Conectar con abuelos', group: 'social-familia', keywords: ['abuelo', 'ancianos', 'familia', 'sabiduria'] },
      { emoji: '👵', label: 'Conectar con abuelas', group: 'social-familia', keywords: ['abuela', 'anciana', 'visita', 'familia'] },
      { emoji: '🧑‍🤝‍🧑', label: 'Compañerismo', group: 'social-familia', keywords: ['amigos', 'pareja', 'socios', 'compania'] },
      { emoji: '💬', label: 'Mensajes y chat', group: 'social-familia', keywords: ['chat', 'mensaje', 'whatsapp', 'responder'] },
      { emoji: '🎂', label: 'Aniversarios y cumpleaños', group: 'social-familia', keywords: ['pastel', 'cake', 'cumpleanos', 'aniversario'] },
    ],
  },
  {
    id: 'creatividad-arte',
    name: 'Creatividad y Arte',
    icon: '🎨',
    icons: [
      { emoji: '🎨', label: 'Pintura y arte', group: 'creatividad-arte', keywords: ['arte', 'art', 'pintura', 'dibujo', 'creatividad'] },
      { emoji: '🎭', label: 'Teatro y actuación', group: 'creatividad-arte', keywords: ['teatro', 'drama', 'actuacion', 'mascaras'] },
      { emoji: '🎬', label: 'Cine y video', group: 'creatividad-arte', keywords: ['cine', 'movie', 'pelicula', 'video', 'claqueta'] },
      { emoji: '📷', label: 'Fotografía', group: 'creatividad-arte', keywords: ['foto', 'camara', 'camera', 'fotografia', 'recuerdos'] },
      { emoji: '🎵', label: 'Música y melodía', group: 'creatividad-arte', keywords: ['musica', 'music', 'nota', 'melodia', 'cancion'] },
      { emoji: '🎸', label: 'Tocar guitarra', group: 'creatividad-arte', keywords: ['guitarra', 'guitar', 'instrumento', 'tocar'] },
      { emoji: '🎹', label: 'Tocar piano', group: 'creatividad-arte', keywords: ['piano', 'teclas', 'musica clasica', 'ensayar'] },
      { emoji: '🎻', label: 'Violín y cuerdas', group: 'creatividad-arte', keywords: ['violin', 'cuerdas', 'orquesta', 'practicar'] },
      { emoji: '🥁', label: 'Batería y percusión', group: 'creatividad-arte', keywords: ['bateria', 'drums', 'ritmo', 'percusion'] },
      { emoji: '🎺', label: 'Viento y trompeta', group: 'creatividad-arte', keywords: ['trompeta', 'trumpet', 'viento', 'jazz'] },
      { emoji: '🎤', label: 'Canto y voz', group: 'creatividad-arte', keywords: ['cantar', 'microfono', 'voz', 'karaoke', 'canto'] },
      { emoji: '🧵', label: 'Costura y bordado', group: 'creatividad-arte', keywords: ['hilo', 'costura', 'sewing', 'artesania'] },
      { emoji: '🧶', label: 'Tejer y lana', group: 'creatividad-arte', keywords: ['lana', 'yarn', 'tejer', 'knitting', 'manualidades'] },
      { emoji: '🎧', label: 'Escuchar música', group: 'creatividad-arte', keywords: ['audifonos', 'headphones', 'musica', 'podcast', 'audio'] },
      { emoji: '📻', label: 'Radio y locución', group: 'creatividad-arte', keywords: ['radio', 'audio', 'locucion', 'noticias'] },
    ],
  },
  {
    id: 'naturaleza-mascotas',
    name: 'Naturaleza y Mascotas',
    icon: '🌿',
    icons: [
      { emoji: '🌿', label: 'Plantas y verde', group: 'naturaleza-mascotas', keywords: ['plantas', 'green', 'hojas', 'naturaleza', 'medio ambiente'] },
      { emoji: '🌲', label: 'Bosque y pinos', group: 'naturaleza-mascotas', keywords: ['arbol', 'tree', 'bosque', 'pino', 'naturaleza'] },
      { emoji: '🌳', label: 'Árboles y parques', group: 'naturaleza-mascotas', keywords: ['arbol', 'parque', 'sombra', 'aire puro'] },
      { emoji: '🌴', label: 'Palmeras y trópico', group: 'naturaleza-mascotas', keywords: ['palmera', 'playa', 'isla', 'vacaciones'] },
      { emoji: '🌵', label: 'Suculentas y resistencia', group: 'naturaleza-mascotas', keywords: ['cactus', 'suculenta', 'desierto', 'resistencia'] },
      { emoji: '🌻', label: 'Girasoles y optimismo', group: 'naturaleza-mascotas', keywords: ['girasol', 'sunflower', 'flores', 'energia'] },
      { emoji: '🐶', label: 'Perro y paseo', group: 'naturaleza-mascotas', keywords: ['perro', 'dog', 'mascota', 'pasear al perro', 'canino'] },
      { emoji: '🐱', label: 'Gato y compañía', group: 'naturaleza-mascotas', keywords: ['gato', 'cat', 'mascota', 'felino', 'ronroneo'] },
      { emoji: '🐾', label: 'Huellas y animales', group: 'naturaleza-mascotas', keywords: ['huellas', 'paws', 'animales', 'paseo'] },
      { emoji: '🦜', label: 'Aves y pájaros', group: 'naturaleza-mascotas', keywords: ['loro', 'ave', 'pajaro', 'canto', 'animal'] },
      { emoji: '🐠', label: 'Peces y acuario', group: 'naturaleza-mascotas', keywords: ['pez', 'fish', 'acuario', 'alimentar'] },
      { emoji: '🐢', label: 'Cuidado pausado', group: 'naturaleza-mascotas', keywords: ['tortuga', 'turtle', 'paciencia', 'calma'] },
      { emoji: '🐝', label: 'Apicultura y ecología', group: 'naturaleza-mascotas', keywords: ['abeja', 'bee', 'polinizacion', 'ecologia'] },
      { emoji: '🦋', label: 'Transformación y mariposa', group: 'naturaleza-mascotas', keywords: ['mariposa', 'butterfly', 'cambio', 'belleza'] },
      { emoji: '🍄', label: 'Recolección y hongos', group: 'naturaleza-mascotas', keywords: ['hongo', 'champinon', 'setas', 'bosque'] },
    ],
  },
  {
    id: 'comida-bebida',
    name: 'Comida y Bebida',
    icon: '🥗',
    icons: [
      { emoji: '🥗', label: 'Ensalada saludable', group: 'comida-bebida', keywords: ['ensalada', 'salad', 'verduras', 'saludable', 'dieta'] },
      { emoji: '🍎', label: 'Fruta diaria', group: 'comida-bebida', keywords: ['manzana', 'apple', 'fruta', 'snack saludable'] },
      { emoji: '🥑', label: 'Aguacate y grasas sanas', group: 'comida-bebida', keywords: ['aguacate', 'avocado', 'keto', 'desayuno'] },
      { emoji: '🥦', label: 'Brócoli y vegetales', group: 'comida-bebida', keywords: ['brocoli', 'verduras', 'nutricion', 'verde'] },
      { emoji: '🥕', label: 'Zanahorias y vitaminas', group: 'comida-bebida', keywords: ['zanahoria', 'carrot', 'vitamina a', 'cocinar'] },
      { emoji: '🍳', label: 'Desayuno nutritivo', group: 'comida-bebida', keywords: ['huevo', 'egg', 'desayuno', 'proteina', 'cocinar'] },
      { emoji: '🍲', label: 'Sopa y comida casera', group: 'comida-bebida', keywords: ['sopa', 'soup', 'comida casera', 'almuerzo'] },
      { emoji: '🍱', label: 'Comida preparada', group: 'comida-bebida', keywords: ['bento', 'meal prep', 'lunch', 'tupper'] },
      { emoji: '☕', label: 'Café matutino', group: 'comida-bebida', keywords: ['cafe', 'coffee', 'despertar', 'energia', 'espresso'] },
      { emoji: '🥛', label: 'Leche y lácteos', group: 'comida-bebida', keywords: ['leche', 'milk', 'calcio', 'bebida'] },
      { emoji: '🍇', label: 'Uvas y antioxidantes', group: 'comida-bebida', keywords: ['uvas', 'grapes', 'fruta', 'postre'] },
      { emoji: '🍌', label: 'Plátano y potasio', group: 'comida-bebida', keywords: ['platano', 'banana', 'energia', 'snack'] },
      { emoji: '🥣', label: 'Avena y cereales', group: 'comida-bebida', keywords: ['avena', 'cereal', 'oatmeal', 'fibra', 'desayuno'] },
      { emoji: '🥪', label: 'Sandwich saludable', group: 'comida-bebida', keywords: ['sandwich', 'emparedado', 'almuerzo', 'snack'] },
      { emoji: '🥘', label: 'Cocinar en casa', group: 'comida-bebida', keywords: ['cocinar', 'cooking', 'olla', 'cena', 'receta'] },
    ],
  },
  {
    id: 'viajes-aire-libre',
    name: 'Viajes y Aire Libre',
    icon: '✈️',
    icons: [
      { emoji: '✈️', label: 'Viajes y vuelos', group: 'viajes-aire-libre', keywords: ['avion', 'plane', 'viaje', 'travel', 'volar', 'vacaciones'] },
      { emoji: '⛺', label: 'Acampar al aire libre', group: 'viajes-aire-libre', keywords: ['camping', 'tienda', 'acampada', 'naturaleza'] },
      { emoji: '🏕️', label: 'Campamento base', group: 'viajes-aire-libre', keywords: ['campamento', 'montana', 'aventura', 'outdoor'] },
      { emoji: '🏖️', label: 'Playa y descanso', group: 'viajes-aire-libre', keywords: ['playa', 'beach', 'mar', 'verano'] },
      { emoji: '⛰️', label: 'Senderismo en montaña', group: 'viajes-aire-libre', keywords: ['montana', 'hiking', 'trekking', 'cumbre'] },
      { emoji: '🗺️', label: 'Exploración y mapas', group: 'viajes-aire-libre', keywords: ['mapa', 'map', 'ruta', 'orientacion'] },
      { emoji: '🧭', label: 'Brújula y dirección', group: 'viajes-aire-libre', keywords: ['brujula', 'compass', 'direccion', 'norte'] },
      { emoji: '🧳', label: 'Equipaje y maleta', group: 'viajes-aire-libre', keywords: ['maleta', 'luggage', 'viajar', 'empacar'] },
      { emoji: '🚂', label: 'Tren y trayectos', group: 'viajes-aire-libre', keywords: ['tren', 'train', 'viaje', 'transporte'] },
      { emoji: '⛵', label: 'Navegación a vela', group: 'viajes-aire-libre', keywords: ['velero', 'sailboat', 'navegar', 'mar'] },
      { emoji: '🛶', label: 'Paseo en canoa', group: 'viajes-aire-libre', keywords: ['kayak', 'canoa', 'rio', 'remo'] },
      { emoji: '🛵', label: 'Moto y paseo', group: 'viajes-aire-libre', keywords: ['moto', 'scooter', 'paseo', 'transporte'] },
      { emoji: '🌇', label: 'Puesta de sol en ciudad', group: 'viajes-aire-libre', keywords: ['ciudad', 'sunset', 'atardecer', 'paisaje'] },
      { emoji: '🌠', label: 'Deseos bajo las estrellas', group: 'viajes-aire-libre', keywords: ['estrella fugaz', 'cielo', 'noche', 'deseo'] },
      { emoji: '🏝️', label: 'Isla desierta', group: 'viajes-aire-libre', keywords: ['isla', 'mar', 'aventura', 'retiro'] },
    ],
  },
  {
    id: 'habitos-a-dejar',
    name: 'Hábitos a Dejar',
    icon: '🚭',
    icons: [
      { emoji: '🚭', label: 'Dejar de fumar', group: 'habitos-a-dejar', keywords: ['no fumar', 'cigarro', 'tabaco', 'smoke', 'dejar fumar'] },
      { emoji: '🚫', label: 'Prohibido o evitar', group: 'habitos-a-dejar', keywords: ['prohibido', 'stop', 'evitar', 'limite', 'no'] },
      { emoji: '🛑', label: 'Parar a tiempo', group: 'habitos-a-dejar', keywords: ['alto', 'stop', 'freno', 'senial'] },
      { emoji: '📵', label: 'Menos pantalla móvil', group: 'habitos-a-dejar', keywords: ['no movil', 'desconexion', 'no celular', 'pantalla', 'digital detox'] },
      { emoji: '📺', label: 'Menos televisión', group: 'habitos-a-dejar', keywords: ['tv', 'television', 'pantallas', 'ocio pasivo'] },
      { emoji: '🎮', label: 'Menos videojuegos', group: 'habitos-a-dejar', keywords: ['videojuegos', 'gaming', 'consola', 'tiempo libre'] },
      { emoji: '🍺', label: 'Reducir alcohol', group: 'habitos-a-dejar', keywords: ['cerveza', 'beer', 'alcohol', 'trago', 'sobriedad'] },
      { emoji: '🍷', label: 'Limitar vino', group: 'habitos-a-dejar', keywords: ['vino', 'wine', 'alcohol', 'moderacion'] },
      { emoji: '🍸', label: 'Limitar cócteles', group: 'habitos-a-dejar', keywords: ['coctel', 'copa', 'fiesta', 'bebida'] },
      { emoji: '🍔', label: 'Evitar comida chatarra', group: 'habitos-a-dejar', keywords: ['hamburguesa', 'fast food', 'comida rapida', 'chatarra'] },
      { emoji: '🍟', label: 'Evitar frituras', group: 'habitos-a-dejar', keywords: ['papas fritas', 'frituras', 'grasa', 'snack'] },
      { emoji: '🍕', label: 'Limitar pizzas', group: 'habitos-a-dejar', keywords: ['pizza', 'antojos', 'comida procesada'] },
      { emoji: '🍩', label: 'Evitar azúcar y donas', group: 'habitos-a-dejar', keywords: ['dona', 'azucar', 'dulces', 'golosinas'] },
      { emoji: '🍰', label: 'Evitar pasteles', group: 'habitos-a-dejar', keywords: ['pastel', 'torta', 'azucar', 'calorias'] },
      { emoji: '🛒', label: 'Evitar compras innecesarias', group: 'habitos-a-dejar', keywords: ['compras', 'shopping', 'gasto innecesario', 'consumismo'] },
    ],
  },
  {
    id: 'simbolos-logros',
    name: 'Símbolos y Logros',
    icon: '⭐',
    icons: [
      { emoji: '⭐', label: 'Estrella de excelencia', group: 'simbolos-logros', keywords: ['estrella', 'star', 'favorito', 'destacado', 'exito'] },
      { emoji: '🌟', label: 'Brillo y superación', group: 'simbolos-logros', keywords: ['brillo', 'sparkle', 'resplandor', 'progreso'] },
      { emoji: '✨', label: 'Chispa y magia', group: 'simbolos-logros', keywords: ['chispas', 'magia', 'motivacion', 'energia'] },
      { emoji: '🏆', label: 'Trofeo de victoria', group: 'simbolos-logros', keywords: ['trofeo', 'trophy', 'campeon', 'victoria', 'ganar', 'logro'] },
      { emoji: '🥇', label: 'Primer lugar', group: 'simbolos-logros', keywords: ['medalla de oro', 'primer lugar', 'oro', 'ganador'] },
      { emoji: '🥈', label: 'Segundo lugar', group: 'simbolos-logros', keywords: ['medalla de plata', 'segundo lugar', 'plata'] },
      { emoji: '🥉', label: 'Tercer lugar', group: 'simbolos-logros', keywords: ['medalla de bronce', 'tercer lugar', 'bronce'] },
      { emoji: '🎖️', label: 'Medalla de honor', group: 'simbolos-logros', keywords: ['medalla', 'condecoracion', 'merito', 'honor'] },
      { emoji: '🎯', label: 'Meta cumplida', group: 'simbolos-logros', keywords: ['diana', 'objetivo', 'meta', 'target', 'foco', 'precision'] },
      { emoji: '🔥', label: 'Racha y fuego', group: 'simbolos-logros', keywords: ['fuego', 'fire', 'racha', 'streak', 'pasion', 'intensidad'] },
      { emoji: '🚀', label: 'Impulso y despegue', group: 'simbolos-logros', keywords: ['cohete', 'rocket', 'despegue', 'impulso', 'meta'] },
      { emoji: '👑', label: 'Corona de maestría', group: 'simbolos-logros', keywords: ['corona', 'crown', 'maestria', 'rey', 'liderazgo'] },
      { emoji: '⚡', label: 'Energía y rapidez', group: 'simbolos-logros', keywords: ['rayo', 'energia', 'lightning', 'rapido', 'fuerza'] },
      { emoji: '💯', label: 'Puntuación perfecta', group: 'simbolos-logros', keywords: ['cien', '100', 'perfecto', 'completado', 'score'] },
      { emoji: '✔️', label: 'Check de completado', group: 'simbolos-logros', keywords: ['check', 'marca', 'hecho', 'done', 'listo'] },
    ],
  },
];

export const ALL_HABIT_ICONS: HabitIconItem[] = HABIT_ICON_GROUPS.flatMap(g => g.icons);

const normalizeString = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export function searchIcons(query: string): HabitIconItem[] {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return ALL_HABIT_ICONS;
  }

  const rawTrimmed = query.trim();
  const normalizedQuery = normalizeString(query);

  return ALL_HABIT_ICONS.filter(item => {
    if (item.emoji === rawTrimmed) {
      return true;
    }
    if (normalizeString(item.label).includes(normalizedQuery)) {
      return true;
    }
    return item.keywords.some(k => normalizeString(k).includes(normalizedQuery));
  });
}

export const HABIT_COLOR_PALETTES: HabitColorPalette[] = [
  {
    id: 'blue',
    name: 'Azul',
    colors: ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#93c5fd'],
  },
  {
    id: 'cyan',
    name: 'Cian',
    colors: ['#06b6d4', '#22d3ee', '#0891b2', '#0e7490', '#67e8f9'],
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    colors: ['#10b981', '#34d399', '#059669', '#047857', '#6ee7b7'],
  },
  {
    id: 'green',
    name: 'Verde',
    colors: ['#22c55e', '#4ade80', '#16a34a', '#15803d', '#86efac'],
  },
  {
    id: 'amber',
    name: 'Ámbar',
    colors: ['#f59e0b', '#fbbf24', '#d97706', '#b45309', '#fcd34d'],
  },
  {
    id: 'orange',
    name: 'Naranja',
    colors: ['#f97316', '#fb923c', '#ea580c', '#c2410c', '#fdba74'],
  },
  {
    id: 'red',
    name: 'Rojo',
    colors: ['#ef4444', '#f87171', '#dc2626', '#b91c1c', '#fca5a5'],
  },
  {
    id: 'pink',
    name: 'Rosa',
    colors: ['#ec4899', '#f472b6', '#db2777', '#be185d', '#f9a8d4'],
  },
  {
    id: 'purple',
    name: 'Púrpura',
    colors: ['#a855f7', '#c084fc', '#9333ea', '#7e22ce', '#d8b4fe'],
  },
  {
    id: 'violet',
    name: 'Violeta',
    colors: ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#c4b5fd'],
  },
  {
    id: 'indigo',
    name: 'Índigo',
    colors: ['#6366f1', '#818cf8', '#4f46e5', '#4338ca', '#a5b4fc'],
  },
  {
    id: 'neutral',
    name: 'Neutro',
    colors: ['#64748b', '#94a3b8', '#475569', '#334155', '#cbd5e1'],
  },
];

export const ALL_PRESET_COLORS: string[] = HABIT_COLOR_PALETTES.flatMap(p => p.colors);

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(hex: string): boolean {
  if (typeof hex !== 'string') {
    return false;
  }
  return HEX_COLOR_REGEX.test(hex.trim());
}

export function normalizeHexColor(hex: string): string {
  if (typeof hex !== 'string') {
    return '#000000';
  }
  let cleaned = hex.trim();
  if (!cleaned) {
    return '#000000';
  }
  if (!cleaned.startsWith('#')) {
    cleaned = `#${cleaned}`;
  }
  cleaned = cleaned.toLowerCase();

  const match3 = /^#([0-9a-f]{3})$/i.exec(cleaned);
  if (match3) {
    const [, rgb] = match3;
    return `#${rgb[0]}${rgb[0]}${rgb[1]}${rgb[1]}${rgb[2]}${rgb[2]}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(cleaned)) {
    return cleaned;
  }

  return '#000000';
}

export function getReadableTextColor(bgColorHex: string): '#ffffff' | '#0f172a' {
  const normalized = normalizeHexColor(bgColorHex);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const toLinear = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const lBg = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const lDark = 0.009; // luminance of #0f172a
  const lWhite = 1.0;

  const contrastDark = (lBg + 0.05) / (lDark + 0.05);
  const contrastWhite = (lWhite + 0.05) / (lBg + 0.05);

  return contrastDark >= contrastWhite ? '#0f172a' : '#ffffff';
}
