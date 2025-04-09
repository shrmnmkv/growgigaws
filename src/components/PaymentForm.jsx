import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Spinner } from 'react-bootstrap';
import { CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

function PaymentForm({ milestone, onPaymentComplete }) {
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardBrand: 'visa'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!paymentDetails.cardNumber || !paymentDetails.cardHolder || 
        !paymentDetails.expiryMonth || !paymentDetails.expiryYear || !paymentDetails.cvv) {
      toast.error('Please fill in all payment details');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.post('/payments/fund-escrow', {
        milestoneData: milestone,
        paymentMethod: 'card',
        paymentDetails: {
          cardNumber: paymentDetails.cardNumber,
          cardHolder: paymentDetails.cardHolder,
          expiryMonth: paymentDetails.expiryMonth,
          expiryYear: paymentDetails.expiryYear,
          cardBrand: paymentDetails.cardBrand
        }
      });

      toast.success('Payment processed successfully');
      if (onPaymentComplete) {
        onPaymentComplete(response.data);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Card.Body>
        <div className="d-flex align-items-center mb-4">
          <CreditCard size={24} className="text-primary me-2" />
          <h4 className="mb-0">Payment Details</h4>
        </div>

        <div className="mb-4">
          <h5 className="mb-3">Amount to Fund</h5>
          <div className="d-flex align-items-center">
            <DollarSign size={20} className="text-success me-2" />
            <span className="h3 mb-0">{milestone.amount} {milestone.currency}</span>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Card Number</Form.Label>
            <Form.Control
              type="text"
              name="cardNumber"
              value={paymentDetails.cardNumber}
              onChange={handleInputChange}
              placeholder="1234 5678 9012 3456"
              maxLength="16"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Card Holder Name</Form.Label>
            <Form.Control
              type="text"
              name="cardHolder"
              value={paymentDetails.cardHolder}
              onChange={handleInputChange}
              placeholder="John Doe"
              required
            />
          </Form.Group>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Expiry Month</Form.Label>
                <Form.Select
                  name="expiryMonth"
                  value={paymentDetails.expiryMonth}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Month</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = (i + 1).toString().padStart(2, '0');
                    return (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Expiry Year</Form.Label>
                <Form.Select
                  name="expiryYear"
                  value={paymentDetails.expiryYear}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Year</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = (new Date().getFullYear() + i).toString();
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>CVV</Form.Label>
                <Form.Control
                  type="text"
                  name="cvv"
                  value={paymentDetails.cvv}
                  onChange={handleInputChange}
                  placeholder="123"
                  maxLength="4"
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Card Type</Form.Label>
            <Form.Select
              name="cardBrand"
              value={paymentDetails.cardBrand}
              onChange={handleInputChange}
              required
            >
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">American Express</option>
            </Form.Select>
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            className="w-100"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              'Fund Escrow'
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default PaymentForm;