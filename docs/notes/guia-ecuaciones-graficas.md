# 📚 Guía de Ecuaciones y Constructor Visual Matemático (AFFiNITe)

> **Bienvenido a la Guía Rápida de Ecuaciones Gráficas de AFFiNITe.**  
> Esta guía está pensada para que tengas todas las fórmulas, estructuras, símbolos y atajos a mano sin tener que memorizar sintaxis compleja.

---

## 🚀 1. Formas de Insertar Ecuaciones en AFFiNITe

| Método | Comando / Atajo | Modo de Apertura | Ideal Para |
| :--- | :--- | :--- | :--- |
| **Ecuación Gráfica** | `/greq` o `/visual-equation` o `/vmath` | **Visual Builder** (Paletas) | Armar fórmulas haciendo clic en plantillas y casillas $\square$. |
| **Bloque de Ecuación** | `/eq` o `$$$$ ` | **Code Editor** (LaTeX) | Escribir directamente en código fuente LaTeX. |
| **Ecuación en Línea** | `$fórmula$` o `$$fórmula$$` | **Inline Node** | Fórmulas dentro de párrafos o listas de texto. |

---

## 📐 2. Catálogo de Plantillas Visuales por Materias

### 2.1. Álgebra y Aritmética
| Operación | Plantilla / Snippet | Renderizado |
| :--- | :--- | :--- |
| **Fracción** | `\frac{a}{b}` | $\frac{a}{b}$ |
| **Potencia y Subíndice** | `x_{i}^{n}` | $x_{i}^{n}$ |
| **Raíz Cuadrada** | `\sqrt{x}` | $\sqrt{x}$ |
| **Raíz $n$-ésima** | `\sqrt[n]{x}` | $\sqrt[n]{x}$ |
| **Logaritmo en Base $b$** | `\log_{b}(x)` | $\log_{b}(x)$ |
| **Logaritmo Natural** | `\ln(x)` | $\ln(x)$ |
| **Coeficiente Binomial** | `\binom{n}{k}` | $\binom{n}{k}$ |
| **Delimitadores Dinámicos** | `\left( \frac{a}{b} \right)` | $\left( \frac{a}{b} \right)$ |

---

### 2.2. Cálculo Diferencial e Integral
| Concepto | Plantilla / Snippet | Renderizado |
| :--- | :--- | :--- |
| **Derivada Ordinaria** | `\diff{y}{x}` o `\frac{\d y}{\d x}` | $\frac{\mathrm{d}y}{\mathrm{d}x}$ |
| **Derivada Parcial** | `\pdiff{f}{x}` o `\frac{\partial f}{\partial x}` | $\frac{\partial f}{\partial x}$ |
| **Integral Indefinida** | `\int f(x) \, \d x` | $\int f(x) \, \mathrm{d}x$ |
| **Integral Definida** | `\int_{a}^{b} f(x) \, \d x` | $\int_{a}^{b} f(x) \, \mathrm{d}x$ |
| **Integral Doble** | `\iint_{R} f(x,y) \, \d A` | $\iint_{R} f(x,y) \, \mathrm{d}A$ |
| **Integral de Contorno** | `\oint_{C} \bm{F} \cdot \d \bm{r}` | $\oint_{C} \mathbf{F} \cdot \mathrm{d}\mathbf{r}$ |
| **Límite** | `\lim_{x \to a} f(x)` | $\lim_{x \to a} f(x)$ |
| **Sumatoria** | `\sum_{i=1}^{n} a_i` | $\sum_{i=1}^{n} a_i$ |
| **Productoria** | `\prod_{i=1}^{n} x_i` | $\prod_{i=1}^{n} x_i$ |

---

### 2.3. Álgebra Lineal, Matrices y Sistemas
| Estructura | Código LaTeX | Visualización |
| :--- | :--- | :--- |
| **Matriz $2 \times 2$** | `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` | $\begin{pmatrix} a & b \\ c & d \end{pmatrix}$ |
| **Matriz $3 \times 3$** | `\begin{pmatrix} a & b & c \\ d & e & f \\ g & h & i \end{pmatrix}` | $\begin{pmatrix} a & b & c \\ d & e & f \\ g & h & i \end{pmatrix}$ |
| **Determinante** | `\begin{vmatrix} a & b \\ c & d \end{vmatrix}` | $\begin{vmatrix} a & b \\ c & d \end{vmatrix}$ |
| **Vector Columna** | `\begin{pmatrix} x \\ y \\ z \end{pmatrix}` | $\begin{pmatrix} x \\ y \\ z \end{pmatrix}$ |
| **Sistema por Casos** | `f(x) = \begin{cases} a & \text{si } x > 0 \\ b & \text{si } x \le 0 \end{cases}` | $f(x) = \begin{cases} a & \text{si } x > 0 \\ b & \text{si } x \le 0 \end{cases}$ |
| **Ecuaciones Alineadas** | `\begin{aligned} a &= b + c \\ d &= e - f \end{aligned}` | $\begin{aligned} a &= b + c \\ d &= e - f \end{aligned}$ |

---

### 2.4. Alfabeto Griego, Operadores y Conjuntos

* **Letras Griegas Comunes**:
  * $\alpha$ (`\alpha`), $\beta$ (`\beta`), $\gamma$ (`\gamma`), $\delta$ (`\delta`), $\theta$ (`\theta`), $\lambda$ (`\lambda`), $\mu$ (`\mu`), $\pi$ (`\pi`), $\sigma$ (`\sigma`), $\phi$ (`\phi`), $\omega$ (`\omega`).
  * Mayúsculas: $\Delta$ (`\Delta`), $\Theta$ (`\Theta`), $\Lambda$ (`\Lambda`), $\Sigma$ (`\Sigma`), $\Omega$ (`\Omega`).
* **Símbolos y Operadores**:
  * $\pm$ (`\pm`), $\approx$ (`\approx`), $\neq$ (`\neq`), $\le$ (`\le`), $\ge$ (`\ge`), $\infty$ (`\infty`), $\nabla$ (`\nabla`), $\cdot$ (`\cdot`), $\times$ (`\times`).
* **Conjuntos Numéricos Directos**:
  * $\mathbb{R}$ (`\R`), $\mathbb{N}$ (`\N`), $\mathbb{Z}$ (`\Z`), $\mathbb{Q}$ (`\Q`), $\mathbb{C}$ (`\C`).

---

## 🏆 3. Biblioteca de Fórmulas Famosas (1-Clic)

1. **Fórmula General Cuadrática**:
   $$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
2. **Teorema de Pitágoras**:
   $$a^2 + b^2 = c^2$$
3. **Identidad de Euler**:
   $$e^{i\pi} + 1 = 0$$
4. **Distribución Normal Estándar (Gauss)**:
   $$f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}$$
5. **Teorema de Bayes**:
   $$P(A|B) = \frac{P(B|A)P(A)}{P(B)}$$
6. **Ecuación de Schrödinger**:
   $$i\hbar \pdiff{\Psi}{t} = \left( -\frac{\hbar^2}{2m} \nabla^2 + V(\bm{r}, t) \right) \Psi(\bm{r}, t)$$
7. **Ecuaciones de Maxwell**:
   $$\nabla \cdot \bm{E} = \frac{\rho}{\varepsilon_0}, \quad \nabla \times \bm{E} = -\pdiff{\bm{B}}{t}, \quad \nabla \cdot \bm{B} = 0, \quad \nabla \times \bm{B} = \mu_0 \bm{J} + \mu_0 \varepsilon_0 \pdiff{\bm{E}}{t}$$
