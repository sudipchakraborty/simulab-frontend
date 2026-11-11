# Codex Master Prompt — SimuLab Hardware Components and Integrated Web IDE

## ROLE

You are a senior embedded systems engineer, electronics simulation architect, full-stack developer, and automated testing engineer.

You are working on my existing project named **SimuLab**, a browser-based electronics simulation platform supporting Arduino Uno, ESP32, ESP32-S3, and additional microcontrollers.

Your task is to extend the existing application without breaking any implemented features.

**IMPORTANT:** First inspect the entire existing project, architecture, simulator, component models, IDE implementation, dependencies, and testing framework. Reuse existing functionality wherever possible. Do not rebuild the application unnecessarily.

## OBJECTIVE 1 — CREATE FIVE ELECTRONIC COMPONENT MODELS

Implement the following components within the existing Hardware Component Library.

### Component 1: DS3231 RTC Module

Create a realistic DS3231 real-time clock module.

Requirements:

- Visual representation with pin labels
- Pins: VCC, GND, SDA, SCL, SQW, 32K
- I2C communication and configurable device address (default 0x68)
- Simulated date, time, seconds, minutes, hours, day, month, and year
- BCD register behavior
- Time-setting and time-reading operations
- Support RTC lost-power status and alarm registers
- Simulated SQW and alarm output
- Support common Arduino RTClib and compatible APIs where feasible
- Wiring validation and electrical warnings
- Display live simulated RTC time in component properties

Ensure time progresses according to the simulation clock, with deterministic test mode.

### Component 2: CD74HC4067 / CD4067 16-Channel Multiplexer

Create a 16-channel analog multiplexer/demultiplexer.

Requirements:

- Pins: VCC, GND, S0, S1, S2, S3, SIG/COM, EN
- 16 selectable channels: C0–C15
- Channel selection based on four digital address lines
- Active-low enable
- Bidirectional analog signal routing
- Digital signal routing when electrically valid
- Simulated propagation delay and switching behavior
- Voltage range and signal validation
- Visually highlight the selected channel
- Show live address and channel value

**Technical accuracy:** The CD74HC4067 and CD4067B have different electrical specifications. Implement separate device profiles or clearly labeled variants, not one inaccurate universal model.

### Component 3: DC Motor

Create a configurable DC brushed motor component.

Requirements:

- Positive and negative power terminals
- Animated motor shaft rotation
- Direction: clockwise and counterclockwise
- Configurable rated voltage, RPM, resistance, inertia, and load
- Start/stop and speed variation
- PWM control through an appropriate motor driver
- Approximate current, torque, and RPM modeling
- Back-EMF representation
- Motor stalled condition
- Optional encoder feedback pins when using an encoder variant

Do not assume a microcontroller GPIO can directly drive a DC motor.

Provide appropriate driver integration, such as L298N, TB6612FNG, MOSFET, or H-bridge models where already supported.

### Component 4: WS2812 / WS2812B RGB LED

Create an individually addressable RGB LED component.

Requirements:

- Pins: VDD, GND, DIN, DOUT
- Configurable RGB color
- Brightness control
- Support multiple LEDs in a daisy chain
- Configurable LED count for a strip
- Support single-wire data protocol timing
- Model pixel update and reset/latch behavior
- Animated LED visualization
- Color value inspection
- Power consumption estimation
- Support common FastLED and Adafruit NeoPixel usage patterns when supported by the simulation engine

Support ESP32, ESP32-S3, and Arduino Uno simulation targets.

### Component 5: 5V Relay Module

Create a simulated 5V relay module.

Requirements:

- Pins: VCC, GND, IN
- Switch terminals: COM, NO, NC
- Active-low / active-high trigger configuration
- Energized and de-energized relay states
- Visible switching animation
- Simulated switching delay
- Click indication in visual simulation, optional sound
- Load circuit switching
- Contact continuity behavior
- Coil/module power estimation
- Visual ON/OFF status LED
- Contact rating and safety validation

Distinguish a powered relay module with its driver circuit from a bare relay coil.

Do not assume that all 5V relay modules accept 3.3V logic. Use configurable module profiles and warn about compatibility.

## OBJECTIVE 2 — INTEGRATED WEB IDE WITH TABBED INTERFACE

Design a professional IDE integrated into SimuLab.

**The most important requirement is that the hardware view and code editor occupy the same main workspace but are accessed through separate tabs.**

Use the following tab structure:

1. Hardware
2. Code Editor
3. Debugger
4. Serial Monitor

### Hardware Tab

- Display the existing electronics canvas
- Add the five new components to the library
- Drag and drop components
- Connect pins using wires
- Zoom, pan, select, move, and delete components
- Edit properties
- Validate wire connectivity
- Save and load the circuit
- Show component values during simulation
- Preserve the circuit when switching tabs

### Code Editor Tab

Create an IDE suitable for Arduino Uno and ESP32-family development.

Features:

- Monaco Editor or an existing compatible editor
- Arduino C/C++ syntax highlighting
- Auto indentation and bracket matching
- Multiple code file tabs
- Search and replace
- Code formatting
- Error and warning markers
- Arduino project support (.ino, .h, .cpp)
- Build output panel
- Board selector
- Port selector
- Library management interface
- Compile button
- Upload button
- Start Simulation button
- Stop Simulation button
- Save Project button

Support initially:

- Arduino Uno
- ESP32 DevKit
- ESP32-S3 DevKit
- YD-ESP32-S3-N16R8, using an accurately configured compatible board definition

### Debugger Tab

Implement a real debugging architecture.

Features:

- Breakpoint management
- Step Into
- Step Over
- Step Out
- Continue
- Pause
- Restart
- Variable Watch
- Call Stack
- Register View, where supported
- GPIO state inspection
- I2C transaction inspector
- PWM signal inspector
- Simulation event timeline
- Highlight the currently executing source line

**Critical engineering requirement:** Do not fake execution-line highlighting.

Source-line highlighting and stepping must be connected to a real execution engine that supports debug metadata, instruction tracking, or source mappings.

If an MCU target does not support instruction-level debugging, disable those controls and clearly explain the limitation.

For physical-board debugging, integrate supported debugger backends such as OpenOCD and GDB when compatible hardware is available.

### Serial Monitor Tab

- Display UART serial output
- Support configurable baud rates
- Send data to serial input
- Clear output
- Pause/resume
- Auto-scroll
- Timestamp option
- Export serial logs
- Support simulated serial connections and physical USB serial ports

## OBJECTIVE 3 — COMPILATION AND PHYSICAL BOARD UPLOAD

Implement a safe and practical toolchain architecture.

Compilation:

- Integrate Arduino CLI for Arduino-compatible boards
- Support Arduino Uno and ESP32-family board packages
- Show compiler errors and warnings
- Display build progress
- Support incremental builds where available
- Preserve detailed compilation logs
- Map compilation errors to source code lines

Physical upload:

- Support Arduino CLI / avrdude / esptool through supported board toolchains
- Detect compatible connected boards
- Allow USB serial port selection
- Display upload progress
- Verify success/failure
- Provide informative upload error messages

Because the application is browser-based, create an appropriate secure local companion service for operations that browsers cannot reliably perform.

Prefer reusing the existing backend and add a local hardware agent only where required.

Never expose arbitrary shell command execution through the frontend.

Implement explicit user authorization and access control for hardware upload.

## OBJECTIVE 4 — SIMULATION ENGINE INTEGRATION

The five new components must not be decorative images.

Each component should implement:

- Pin definitions
- Electrical connectivity
- Functional simulation model
- Input/output state propagation
- Simulation clock synchronization
- Properties interface
- Serialization/deserialization
- Error handling
- Validation
- Automated unit tests

Create a modular component model interface so that future electronic components can be added without modifying the entire simulation engine.

Clearly distinguish:

1. Circuit visualization
2. Electrical component behavior
3. MCU firmware execution
4. Physical hardware operations

Do not claim arbitrary compiled firmware can be simulated unless a compatible MCU execution backend is actually integrated.

## OBJECTIVE 5 — USER INTERFACE AND TAB BEHAVIOR

The interface must have one main working area.

Header:

SimuLab | Project Name | Board Selector | Save | Build | Upload | Run | Stop

Main tabs:

[Hardware] [Code Editor] [Debugger] [Serial Monitor]

Switching tabs must:

- Never reset the hardware circuit
- Never erase unsaved code
- Preserve simulation state
- Preserve zoom and canvas position
- Preserve cursor position and breakpoints
- Preserve serial monitor history

Use responsive layout and maximize available screen space.

Provide a resizable bottom panel for build output, console messages, and errors.

Ensure keyboard shortcuts and accessible tab navigation.

## OBJECTIVE 6 — AUTOMATED TESTING

Create automated tests for all implemented components.

Minimum test scenarios:

**DS3231**
- Read/write time
- Verify clock progression
- Verify I2C communication
- Verify alarm behavior

**Multiplexer**
- Select all 16 channels
- Verify enable behavior
- Verify analog routing
- Verify digital address switching

**DC Motor**
- Start/stop
- PWM speed change
- Reverse direction
- Stalled rotor behavior

**WS2812**
- Set RGB colors
- Daisy chain multiple LEDs
- Update brightness
- Validate data signal timing

**Relay**
- Energize/de-energize
- Verify COM–NO and COM–NC continuity
- Change trigger polarity
- Test switching delay

**IDE**
- Open and close tabs
- Switch tabs without losing data
- Edit and save code
- Compile a sample Arduino sketch
- Handle build failure
- Detect hardware ports
- Upload with user authorization
- Test debugger capability detection
- Verify serial monitor input/output

Use the project's existing test tools, and add suitable tools only where necessary.

## OBJECTIVE 7 — IMPLEMENTATION WORKFLOW

Follow this execution order:

**Phase 1: Architecture inspection**
- Inspect repository
- Identify existing implementation
- Identify missing capabilities
- Create a concise integration plan
- List dependencies and architectural risks

**Phase 2: Components**
- Implement DS3231
- Implement 16-channel multiplexer
- Implement DC motor
- Implement WS2812
- Implement 5V relay
- Add each component to the library
- Complete tests for each model

**Phase 3: Tabbed IDE**
- Implement tab navigation
- Integrate hardware canvas
- Integrate code editor
- Preserve state when switching tabs
- Implement project save/load

**Phase 4: Toolchain**
- Integrate Arduino CLI
- Implement build logs and error markers
- Implement board selection
- Implement local hardware upload agent

**Phase 5: Debug and Serial**
- Implement debugger interfaces
- Connect supported simulation/debug backends
- Integrate serial monitor
- Show current executing line only when supported

**Phase 6: End-to-end validation**
- Run automated tests
- Compile example sketches
- Validate board upload using available hardware
- Validate simulator behavior
- Check regressions
- Fix confirmed defects

## DEVELOPMENT RULES

1. Do not delete existing working modules.
2. Do not change existing APIs unnecessarily.
3. Reuse the current frontend and backend architecture.
4. Maintain modularity and clean interfaces.
5. Implement one component at a time.
6. Write and run tests before completing each phase.
7. Do not silently replace actual simulation behavior with mocked functionality.
8. Use mocks only in explicitly identified tests.
9. Clearly document unsupported hardware/debug features.
10. Do not report a hardware test as passed if no physical board was connected.
11. Use the existing project conventions.
12. Document newly created APIs and configuration requirements.

## FINAL DELIVERABLES

Provide:

- Five functional electronic component models
- Updated component library
- Tabbed Hardware/Code/Debugger/Serial UI
- Integrated Arduino build system
- Supported physical-board upload workflow
- Debugger capability integration
- Automated tests
- Sample Arduino Uno and ESP32-S3 projects
- Architecture documentation
- Component development guide
- Test report
- Remaining limitations and next steps

## EXECUTION INSTRUCTION

Begin by inspecting the current SimuLab repository.

Create `docs/SIMULAB_IMPLEMENTATION_PLAN.md` and maintain a phase-by-phase progress checklist.

Then implement the features in sequence.

Do not stop after creating a plan. Proceed with implementation, testing, and corrections in the repository.

At the end, report exactly which features work, which were tested, which require connected physical hardware, and which remain unsupported.

**The objective is a genuinely functional embedded development and simulation platform, not merely a visually convincing prototype.**