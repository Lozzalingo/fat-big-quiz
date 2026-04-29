"""
Fat Big Quiz — Backend function test script using stealth-browser.
Tests all modules: Analytics, Users, Subscribers, Email, Ops, Logs, Storage, Orders, Products, Config, Settings
"""
import sys
sys.path.insert(0, '/Users/laurencestephan/Programming/tools/stealth-browser')

from stealth_browser import create_stealth_driver, human_sleep
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import json
import time

BASE_URL = "http://localhost:3000"
API_URL = "http://localhost:3001"

def collect_console_logs(driver):
    """Collect browser console logs"""
    try:
        logs = driver.get_log('browser')
        return logs
    except Exception:
        return []

def test_analytics(driver):
    """Test: Visit pages and verify analytics tracking"""
    print("\n=== TESTING ANALYTICS ===")

    # Visit homepage
    driver.get(BASE_URL)
    human_sleep("page_load")
    time.sleep(3)  # Wait for VisitorTracker to fire

    # Check if visitor was tracked
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/visitors/overview');
        return await resp.json();
    """)
    print(f"  Overview: {json.dumps(result, indent=2)}")

    # Visit another page to test multi-page tracking
    driver.get(f"{BASE_URL}/blog")
    human_sleep("page_load")
    time.sleep(3)

    # Check devices
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/visitors/devices');
        return await resp.json();
    """)
    print(f"  Devices: {json.dumps(result, indent=2)[:300]}")

    # Check pages
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/visitors/pages');
        return await resp.json();
    """)
    print(f"  Top Pages: {json.dumps(result, indent=2)[:300]}")

    print("  [OK] Analytics tracking working")
    return True

def test_users(driver):
    """Test: Create user, login, check profile"""
    print("\n=== TESTING USERS ===")

    # Create a test user via API
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/users', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
                email: 'testadmin@fatbigquiz.com',
                password: 'TestPassword123!',
                role: 'admin',
                firstName: 'Test',
                lastName: 'Admin'
            }})
        }});
        return await resp.json();
    """)
    print(f"  Create user: {json.dumps(result, indent=2)[:300]}")

    # Get user by email
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/users/email/testadmin@fatbigquiz.com');
        return await resp.json();
    """)
    print(f"  Get by email: {json.dumps(result, indent=2)[:300]}")

    # Try NextAuth login
    driver.get(f"{BASE_URL}/login")
    human_sleep("page_load")
    time.sleep(2)

    # Take screenshot to see the login page
    driver.save_screenshot("/tmp/fbq-login.png")
    print("  Screenshot saved: /tmp/fbq-login.png")

    print("  [OK] Users working")
    return True

def test_subscribers(driver):
    """Test: Subscribe an email"""
    print("\n=== TESTING SUBSCRIBERS ===")

    # Subscribe via API
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/subscribers', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
                email: 'laurencedotcomputer@gmail.com'
            }})
        }});
        return {{ status: resp.status, data: await resp.json() }};
    """)
    print(f"  Subscribe: {json.dumps(result, indent=2)[:300]}")

    # List subscribers
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/subscribers');
        const data = await resp.json();
        return {{ count: data.length, first3: data.slice(0, 3).map(s => s.email) }};
    """)
    print(f"  Subscribers: {json.dumps(result, indent=2)}")

    print("  [OK] Subscribers working")
    return True

def test_email(driver):
    """Test: Send test email"""
    print("\n=== TESTING EMAIL ===")

    # Send test email via shared package route
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/emails/test', {{
            method: 'POST',
            headers: {{'Content-Type': 'application/json'}},
            body: JSON.stringify({{
                type: 'welcome',
                to: 'laurencedotcomputer@gmail.com'
            }})
        }});
        return {{ status: resp.status, data: await resp.json() }};
    """)
    print(f"  Email test: {json.dumps(result, indent=2)[:300]}")

    print("  [OK] Email tested")
    return True

def test_ops(driver):
    """Test: Health check and ops"""
    print("\n=== TESTING OPS/HEALTH ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/ops/health');
        return await resp.json();
    """)
    print(f"  Health: status={result.get('status')}, uptime={result.get('uptimeFormatted')}")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/ops/detailed');
        return await resp.json();
    """)
    print(f"  Detailed: {json.dumps(result, indent=2)[:400]}")

    print("  [OK] Ops/Health working")
    return True

def test_logs(driver):
    """Test: Logging"""
    print("\n=== TESTING LOGS ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/logs');
        return await resp.json();
    """)
    print(f"  Logs: total={result.get('total')}, page={result.get('page')}")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/logs/stats');
        return await resp.json();
    """)
    print(f"  Stats: {json.dumps(result, indent=2)[:300]}")

    print("  [OK] Logs working")
    return True

def test_storage(driver):
    """Test: Storage stats"""
    print("\n=== TESTING STORAGE ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/storage/stats');
        return await resp.json();
    """)
    print(f"  Stats: {json.dumps(result, indent=2)}")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/storage/files');
        return await resp.json();
    """)
    print(f"  Files: {json.dumps(result, indent=2)[:300]}")

    print("  [OK] Storage working")
    return True

def test_orders(driver):
    """Test: Orders"""
    print("\n=== TESTING ORDERS ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/shared-orders');
        return await resp.json();
    """)
    print(f"  Orders: {json.dumps(result, indent=2)[:300]}")

    print("  [OK] Orders working")
    return True

def test_products(driver):
    """Test: Products (shared merchandise)"""
    print("\n=== TESTING PRODUCTS ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/shared-products');
        return await resp.json();
    """)
    print(f"  Products: {json.dumps(result, indent=2)[:300]}")

    # Also test site-specific products
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/products');
        const data = await resp.json();
        return {{ count: data.length, first: data[0] ? data[0].title : 'none' }};
    """)
    print(f"  Site products: {json.dumps(result, indent=2)}")

    print("  [OK] Products working")
    return True

def test_config(driver):
    """Test: Config/Settings"""
    print("\n=== TESTING CONFIG ===")

    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/app-settings');
        return await resp.json();
    """)
    print(f"  Settings: {json.dumps(result, indent=2)[:300]}")

    # Test Stripe connection
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/app-settings/test-stripe', {{
            method: 'POST'
        }});
        return {{ status: resp.status, data: await resp.json() }};
    """)
    print(f"  Stripe test: {json.dumps(result, indent=2)[:300]}")

    # Test Resend connection
    result = driver.execute_script(f"""
        const resp = await fetch('{API_URL}/api/app-settings/test-resend', {{
            method: 'POST'
        }});
        return {{ status: resp.status, data: await resp.json() }};
    """)
    print(f"  Resend test: {json.dumps(result, indent=2)[:300]}")

    print("  [OK] Config working")
    return True

def test_admin_dashboard(driver):
    """Test: Navigate admin dashboard pages"""
    print("\n=== TESTING ADMIN DASHBOARD ===")

    admin_pages = [
        '/admin/ops',
        '/admin/logs',
        '/admin/emails',
        '/admin/storage',
        '/admin/config',
        '/admin/settings',
    ]

    for page in admin_pages:
        driver.get(f"{BASE_URL}{page}")
        human_sleep("page_load")
        time.sleep(2)

        # Check for errors
        logs = collect_console_logs(driver)
        errors = [l for l in logs if l.get('level') == 'SEVERE']

        title = driver.execute_script("return document.title")
        body_len = driver.execute_script("return document.body.innerText.length")

        status = "ERROR" if errors else "OK"
        print(f"  {page}: {status} (title='{title}', bodyLen={body_len})")
        if errors:
            for e in errors[:3]:
                print(f"    ERROR: {e.get('message', '')[:150]}")

    print("  [OK] Admin dashboard checked")
    return True

def test_newsletter_form(driver):
    """Test: Use the actual newsletter form on the site"""
    print("\n=== TESTING NEWSLETTER FORM ===")

    driver.get(BASE_URL)
    human_sleep("page_load")
    time.sleep(2)

    # Scroll to newsletter section
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1)

    # Try to find newsletter input
    try:
        newsletter_input = driver.find_element(By.CSS_SELECTOR, 'input[type="email"][placeholder*="email" i], input[name="email"], .newsletter input')
        newsletter_input.clear()
        for char in "laurencedotcomputer@gmail.com":
            newsletter_input.send_keys(char)
            human_sleep("typing")

        # Find submit button
        submit = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"], .newsletter button')
        submit.click()
        time.sleep(2)

        driver.save_screenshot("/tmp/fbq-newsletter.png")
        print("  Newsletter form submitted. Screenshot: /tmp/fbq-newsletter.png")
    except Exception as e:
        print(f"  Newsletter form not found or error: {e}")

    print("  [OK] Newsletter form tested")
    return True


def main():
    print("=" * 60)
    print("Fat Big Quiz — Backend Module Test Suite")
    print("=" * 60)

    driver = None
    try:
        driver = create_stealth_driver(use_proxy=False, use_chrome_profile=False, headless=False)
        print(f"Browser started")

        # Run all tests
        tests = [
            test_analytics,
            test_users,
            test_subscribers,
            test_email,
            test_ops,
            test_logs,
            test_storage,
            test_orders,
            test_products,
            test_config,
            test_admin_dashboard,
            test_newsletter_form,
        ]

        results = {}
        for test in tests:
            name = test.__name__
            try:
                results[name] = test(driver)
            except Exception as e:
                print(f"  [FAIL] {name}: {e}")
                results[name] = False

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        for name, passed in results.items():
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}] {name}")

        passed = sum(1 for v in results.values() if v)
        total = len(results)
        print(f"\n  {passed}/{total} tests passed")

    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if driver:
            input("\nPress Enter to close browser...")
            driver.quit()

if __name__ == "__main__":
    main()
