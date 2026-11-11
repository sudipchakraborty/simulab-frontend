import {test,expect} from './fixtures';
test('compiled component sketch drives RTC, motor, relay and timed RGB through the wired laboratory',async({page})=>{
 test.skip(!process.env.SIMULAB_TEST_TOKEN,'Requires real companion and locally installed Adafruit NeoPixel');test.setTimeout(180000);
 await page.goto('/');await page.getByRole('button',{name:'Open component laboratory',exact:true}).click();
 await expect(page.locator('.react-flow__node')).toHaveCount(7);
 await page.getByRole('tab',{name:'Code Editor',exact:true}).click();await page.getByRole('button',{name:'Load component sketch',exact:true}).click();
 await page.getByLabel('Companion token').fill(process.env.SIMULAB_TEST_TOKEN!);await page.getByRole('button',{name:'Connect companion',exact:true}).click();
 await expect(page.getByRole('button',{name:'Build',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Build',exact:true}).click();
 await expect(page.getByLabel('Build output')).toContainText('Build passed',{timeout:120000});await page.getByRole('button',{name:'Load build',exact:true}).click();
 await expect(page.getByTestId('simulation-status')).toHaveText('ready');await page.getByRole('button',{name:'Run',exact:true}).click();
 await expect(page.getByTestId('part-motor')).toContainText(/[1-9]\d* RPM/,{timeout:20000});
 await expect(page.getByTestId('part-rgb').locator('svg rect[fill="#ff0000"],svg rect[fill="#0000ff"]')).toHaveCount(1,{timeout:20000});
 await page.getByRole('tab',{name:'Serial Monitor',exact:true}).click();await expect(page.getByTestId('ide-serial-output')).toContainText('RTC BCD sec/min/hour:',{timeout:15000});
 await page.screenshot({path:'test-results/component-lab-serial.png'});
});
